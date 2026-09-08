import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createHistory,
  getHistoryDetail,
  sendHistoryImage,
  sendHistoryText,
} from "../../api/history";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../auth/AuthProvider";
import { AssistantContent } from "../../components/AssistantContent";
import {
  getLocalImageHistoryItem,
  saveLocalImageHistory,
} from "../../history/imageHistory";
import { loadActiveHistoryId, saveActiveHistoryId } from "../../chat/storage";
import {
  followUpSuggestions,
  isWeakContextAnswer,
} from "../../chat/suggestions";
import {
  preserveFailedRequest,
  retryUsesHistory,
  type FailedRequestState,
} from "../../chat/retryPolicy";
import {
  acquireSubmissionLock,
  captureSubmission,
  imageAfterRequest,
  releaseSubmissionLock,
} from "../../chat/submission";
import {
  cleanupNormalizedImage,
  normalizeImageForUpload,
} from "../../images/normalizeImage";
import { useTutorial } from "../../tutorial/TutorialProvider";
import { ImageSourceSheet } from "../diagnosis/ImageSourceSheet";
import { colors, radius, spacing } from "../../theme";
import type { ChatMessage, Detection, SelectedImage } from "../../types/domain";
import type { TabParamList } from "../../navigation/types";
import { confidenceLabel, diseaseLabel } from "../../utils/diseaseLabels";

type Props = BottomTabScreenProps<TabParamList, "Chat">;
type UploadStage = "uploading" | "analyzing";
const welcomePrompts = [
  "Cách chăm mai sau Tết?",
  "Vì sao lá mai bị vàng?",
  "Khi nào nên bón phân?",
];

function selectedAsset(asset: ImagePicker.ImagePickerAsset): SelectedImage {
  return {
    uri: asset.uri,
    name: asset.fileName || `mai-${Date.now()}.jpg`,
    mimeType: asset.mimeType || "image/jpeg",
    size: asset.fileSize,
    width: asset.width,
    height: asset.height,
    file: (asset as ImagePicker.ImagePickerAsset & { file?: Blob }).file,
  };
}
export function normalizeDetections(value: unknown): Detection[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, Detection>();
  value.forEach((item) => {
    const raw =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const detection = {
      label: typeof raw.name === "string" ? raw.name : undefined,
      confidence:
        typeof raw.confidence === "number" ? raw.confidence : undefined,
    };
    const key = (detection.label || "unknown").trim().toLocaleLowerCase();
    const existing = unique.get(key);
    if (!existing || (detection.confidence ?? -1) > (existing.confidence ?? -1))
      unique.set(key, detection);
  });
  return [...unique.values()];
}
function titleFor(text: string, hasImage: boolean) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean
    ? clean.slice(0, 80)
    : hasImage
      ? `Chẩn đoán ảnh ${new Date().toLocaleDateString("vi-VN")}`
      : "Cuộc trò chuyện mới";
}
function attachImageResult(
  messages: ChatMessage[],
  image: SelectedImage,
  detections?: Detection[],
) {
  let userIndex = -1;
  let assistantIndex = -1;
  messages.forEach((message, index) => {
    if (message.role === "user") userIndex = index;
    if (message.role === "assistant") assistantIndex = index;
  });
  return messages.map((message, index) =>
    index === userIndex
      ? { ...message, imageUri: image.uri }
      : index === assistantIndex && detections
        ? { ...message, detections }
        : message,
  );
}

export function ChatScreen({ navigation, route }: Props) {
  const { account } = useAuth();
  const { registerTarget } = useTutorial();
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [historyTitle, setHistoryTitle] = useState("Cuộc trò chuyện mới");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [diagnosisMode, setDiagnosisMode] = useState(false);
  const [image, setImage] = useState<SelectedImage>();
  const [preparingImage, setPreparingImage] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [openSettings, setOpenSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState("");
  const [historyLoadTarget, setHistoryLoadTarget] = useState<number>();
  const [sending, setSending] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>();
  const [failed, setFailed] = useState<FailedRequestState>();
  const generation = useRef(0);
  const sendLocked = useRef(false);
  const restored = useRef(false);
  const lastRouteOpen = useRef<string | undefined>(undefined);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messageAreaRef = useRef<View>(null);
  const composerRef = useRef<View>(null);
  const sendRef = useRef<View>(null);
  const diagnosisRef = useRef<View>(null);
  const newChatRef = useRef<View>(null);
  useEffect(() => {
    const cleanups = [
      registerTarget("messageArea", { ref: messageAreaRef }),
      registerTarget("composer", { ref: composerRef }),
      registerTarget("send", { ref: sendRef }),
      registerTarget("diagnosis", { ref: diagnosisRef }),
      registerTarget("newChat", { ref: newChatRef }),
    ];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [registerTarget]);

  function beginGeneration() {
    generation.current += 1;
    releaseSubmissionLock(sendLocked);
    setSending(false);
    setUploadStage(undefined);
    return generation.current;
  }
  async function openHistory(id: number) {
    const token = beginGeneration();
    setLoading(true);
    setHistoryId(null);
    setHistoryTitle("Đang tải cuộc trò chuyện...");
    setHistoryLoadError("");
    setHistoryLoadTarget(id);
    setFailed(undefined);
    setImage(undefined);
    setDiagnosisMode(false);
    try {
      const detail = await getHistoryDetail(id);
      const metadata = account?.id
        ? await getLocalImageHistoryItem(account.id, id)
        : undefined;
      if (token !== generation.current) return;
      const next = metadata?.imageUri
        ? attachImageResult(
            detail.messages || [],
            { uri: metadata.imageUri, name: "history-image.jpg" },
            metadata.detections,
          )
        : detail.messages || [];
      setHistoryId(detail.id);
      setHistoryTitle(detail.title || "Cuộc trò chuyện");
      setMessages(next);
      if (account?.id) await saveActiveHistoryId(account.id, detail.id);
    } catch (value) {
      if (token !== generation.current) return;
      if (value instanceof ApiError && value.status === 404) {
        setHistoryId(null);
        setMessages([]);
        setHistoryTitle("Cuộc trò chuyện mới");
        if (account?.id) await saveActiveHistoryId(account.id, null);
        setFailed(undefined);
      } else {
        setMessages([]);
        setHistoryLoadError(
          "Không thể tải cuộc trò chuyện này. Vui lòng thử lại.",
        );
      }
    } finally {
      if (token === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    const requested = route.params?.historyId;
    if (!requested) return;
    const routeKey = `${requested}:${route.params?.openKey || 0}`;
    if (lastRouteOpen.current === routeKey) return;
    lastRouteOpen.current = routeKey;
    restored.current = true;
    void openHistory(requested);
  }, [route.params?.historyId, route.params?.openKey]);
  useEffect(() => {
    if (restored.current || !account?.id || route.params?.historyId) return;
    restored.current = true;
    void loadActiveHistoryId(account.id).then((id) => {
      if (id) void openHistory(id);
    });
  }, [account?.id]);
  function newChat() {
    beginGeneration();
    setHistoryId(null);
    setHistoryTitle("Cuộc trò chuyện mới");
    setMessages([]);
    setText("");
    setImage(undefined);
    setDiagnosisMode(false);
    setFailed(undefined);
    setHistoryLoadError("");
    setHistoryLoadTarget(undefined);
    setLoading(false);
    if (account?.id) void saveActiveHistoryId(account.id, null);
  }

  async function prepare(asset: ImagePicker.ImagePickerAsset) {
    setPreparingImage(true);
    setPickerError("");
    try {
      const previous = image;
      setImage(await normalizeImageForUpload(selectedAsset(asset)));
      await cleanupNormalizedImage(previous);
      setFailed(undefined);
      setSheetOpen(false);
    } catch {
      setPickerError(
        "Không thể chuẩn hóa ảnh này. Vui lòng chọn ảnh JPG hoặc PNG khác.",
      );
    } finally {
      setPreparingImage(false);
    }
  }
  async function chooseGallery() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setOpenSettings(!permission.canAskAgain);
        setPickerError(
          "MaiCare cần quyền truy cập thư viện ảnh để bạn chọn ảnh.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.92,
      });
      if (!result.canceled && result.assets[0]) await prepare(result.assets[0]);
      else setSheetOpen(false);
    } catch {
      setPickerError("Không thể mở thư viện ảnh lúc này.");
    }
  }
  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setOpenSettings(!permission.canAskAgain);
        setPickerError("MaiCare cần quyền camera để bạn chụp ảnh lá mai.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.92,
      });
      if (!result.canceled && result.assets[0]) await prepare(result.assets[0]);
      else setSheetOpen(false);
    } catch {
      setPickerError("Không thể mở camera lúc này.");
    }
  }

  async function reconcile(
    targetId: number,
    selected?: SelectedImage,
    detections?: Detection[],
  ) {
    const detail = await getHistoryDetail(targetId);
    const next = selected
      ? attachImageResult(detail.messages || [], selected, detections)
      : detail.messages || [];
    setMessages(next);
    return next;
  }
  async function send(
    overrideQuestion?: string,
    forcedImage?: SelectedImage | null,
    retry = false,
    forcedHistoryId?: number,
  ) {
    const selected = forcedImage === null ? undefined : forcedImage || image;
    const captured = captureSubmission(
      overrideQuestion ?? text,
      !!selected,
      retry,
      overrideQuestion !== undefined,
    );
    const question = captured.submittedText;
    if ((!question && !selected) || !acquireSubmissionLock(sendLocked)) return;
    const token = generation.current;
    const optimistic: ChatMessage = {
      id: -Date.now(),
      role: "user",
      content: question || "Đã gửi một ảnh để chẩn đoán.",
      createdAt: new Date().toISOString(),
      imageUri: selected?.uri,
    };
    if (!retry) setMessages((current) => [...current, optimistic]);
    if (overrideQuestion === undefined) setText(captured.nextComposerText);
    setFailed(undefined);
    setSending(true);
    setUploadStage(selected ? "uploading" : undefined);
    const stageTimer = selected
      ? setTimeout(() => {
          if (token === generation.current) setUploadStage("analyzing");
        }, 900)
      : undefined;
    let targetId = forcedHistoryId || historyId;
    try {
      if (!targetId) {
        const created = await createHistory(titleFor(question, !!selected));
        if (token !== generation.current) return;
        targetId = created.id;
        setHistoryId(targetId);
        setHistoryTitle(created.title);
        if (account?.id) await saveActiveHistoryId(account.id, targetId);
      }
      if (token !== generation.current) return;
      const response = selected
        ? await sendHistoryImage(targetId, selected, question || undefined)
        : await sendHistoryText(targetId, question);
      if (token !== generation.current) return;
      if (
        Number(response.history_id) !== targetId ||
        typeof response.answer !== "string" ||
        !response.answer.trim()
      )
        throw new ApiError(
          "Phản hồi từ máy chủ không hợp lệ.",
          undefined,
          undefined,
          "malformed",
        );
      const detections = selected
        ? normalizeDetections(response.detections)
        : undefined;
      try {
        await reconcile(targetId, selected, detections);
      } catch {
        setMessages((current) =>
          current.concat({
            id: -(Date.now() + 1),
            role: "assistant",
            content: response.answer as string,
            createdAt: new Date().toISOString(),
            detections,
            sourceQuestion: question,
          }),
        );
      }
      if (selected && account?.id)
        await saveLocalImageHistory({
          userId: account.id,
          conversationId: targetId,
          title: titleFor(question, true),
          description: question || undefined,
          detections: detections || [],
          image: selected,
        }).catch(() => undefined);
      if (selected) {
        setText("");
        setImage(imageAfterRequest(selected, "success"));
        await cleanupNormalizedImage(selected);
      }
      setFailed(undefined);
    } catch (value) {
      if (token !== generation.current) return;
      const error =
        value instanceof ApiError
          ? value
          : new ApiError("Không thể gửi tin nhắn. Vui lòng thử lại.");
      let retryHistoryId: number | undefined = targetId || undefined;
      if (error.status === 404) {
        retryHistoryId = undefined;
        setHistoryId(null);
        setHistoryTitle("Cuộc trò chuyện mới");
        if (account?.id) await saveActiveHistoryId(account.id, null);
      } else if (targetId)
        try {
          await reconcile(targetId, selected);
        } catch {
          /* Keep optimistic turn when reconciliation is unavailable. */
        }
      setImage(imageAfterRequest(selected, "failed"));
      setFailed(
        preserveFailedRequest(
          {
            kind: selected ? "image" : "text",
            question,
            image: selected,
            message: error.userMessage,
            status: error.status,
          },
          retryHistoryId,
        ),
      );
    } finally {
      if (stageTimer) clearTimeout(stageTimer);
      if (token === generation.current) {
        releaseSubmissionLock(sendLocked);
        setSending(false);
        setUploadStage(undefined);
      }
    }
  }
  async function retryFailed() {
    if (!failed || sending) return;
    try {
      if (!failed.historyId) throw new Error("No server history exists yet");
      const before = await getHistoryDetail(failed.historyId);
      const last = before.messages?.at(-1);
      if (last?.role === "assistant") {
        setMessages(
          failed.image
            ? attachImageResult(before.messages || [], failed.image)
            : before.messages || [],
        );
        setFailed(undefined);
        if (failed.kind === "image") setImage(undefined);
        return;
      }
    } catch {
      /* Explicit retry below will surface its own result. */
    }
    await send(
      failed.question,
      failed.image || null,
      true,
      retryUsesHistory(failed),
    );
  }
  const canSend =
    (!!text.trim() || !!image) &&
    !sending &&
    !preparingImage &&
    !loading &&
    !historyLoadError;
  function removeImage() {
    const current = image;
    setImage(undefined);
    setFailed(undefined);
    void cleanupNormalizedImage(current);
  }
  return (
    <SafeAreaView
      testID="chat-screen"
      style={styles.safe}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Mở lịch sử"
            onPress={() => navigation.navigate("History")}
            style={styles.headerButton}
          >
            <Ionicons name="menu" size={23} color={colors.primaryDark} />
          </Pressable>
          <View style={styles.brand}>
            <Text numberOfLines={1} style={styles.brandTitle}>
              MaiCare AI
            </Text>
            <Text numberOfLines={1} style={styles.brandSubtitle}>
              {historyId ? historyTitle : "Sẵn sàng hỗ trợ mai vàng"}
            </Text>
          </View>
          <View
            ref={newChatRef}
            testID="tutorial-target-newChat"
            collapsable={false}
          >
            <Pressable
              accessibilityLabel="Cuộc trò chuyện mới"
              onPress={newChat}
              style={styles.headerButton}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={colors.primaryDark}
              />
            </Pressable>
          </View>
        </View>
        <View
          ref={messageAreaRef}
          testID="tutorial-target-messageArea"
          collapsable={false}
          style={styles.messageArea}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Đang tải cuộc trò chuyện...</Text>
            </View>
          ) : historyLoadError ? (
            <View style={styles.center}>
              <Ionicons
                name="alert-circle-outline"
                size={30}
                color={colors.danger}
              />
              <Text accessibilityRole="alert" style={styles.loadError}>
                {historyLoadError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  historyLoadTarget && void openHistory(historyLoadTarget)
                }
                style={styles.loadRetry}
              >
                <Text style={styles.loadRetryText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.list,
                !messages.length && styles.emptyList,
              ]}
              onContentSizeChange={() =>
                messages.length &&
                listRef.current?.scrollToEnd({ animated: false })
              }
              ListEmptyComponent={<Welcome onSelect={setText} />}
              renderItem={({ item, index }) => (
                <MessageBubble
                  message={item}
                  sourceQuestion={
                    item.sourceQuestion ||
                    [...messages.slice(0, index)]
                      .reverse()
                      .find((value) => value.role === "user")?.content ||
                    ""
                  }
                  onSuggestion={(prompt) => void send(prompt, null)}
                />
              )}
            />
          )}
        </View>
        {sending && (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.muted}>
              {uploadStage === "uploading"
                ? "Đang tải ảnh..."
                : uploadStage === "analyzing"
                  ? "Đang phân tích ảnh..."
                  : "MaiCare đang trả lời..."}
            </Text>
          </View>
        )}
        {failed && (
          <RequestError
            failed={failed}
            busy={sending}
            onRetry={() => void retryFailed()}
            onReplace={() => {
              setDiagnosisMode(true);
              setSheetOpen(true);
            }}
            onRemove={removeImage}
          />
        )}
        {diagnosisMode && (
          <View style={styles.diagnosisTray}>
            <View style={styles.trayHeader}>
              <View>
                <Text style={styles.trayTitle}>Chẩn đoán ảnh</Text>
                <Text style={styles.traySubtitle}>
                  Ảnh được giữ lại nếu gửi thất bại
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Tắt chẩn đoán"
                onPress={() => {
                  setDiagnosisMode(false);
                  removeImage();
                }}
              >
                <Ionicons name="close-circle" size={24} color={colors.muted} />
              </Pressable>
            </View>
            {image ? (
              <View testID="selected-image" style={styles.previewRow}>
                <Image
                  source={{ uri: image.uri }}
                  resizeMode="cover"
                  style={styles.preview}
                />
                <View style={styles.previewActions}>
                  <Pressable
                    onPress={() => setSheetOpen(true)}
                    style={styles.smallAction}
                  >
                    <Text style={styles.smallActionText}>Đổi ảnh</Text>
                  </Pressable>
                  <Pressable onPress={removeImage} style={styles.smallAction}>
                    <Text
                      style={[styles.smallActionText, { color: colors.danger }]}
                    >
                      Xóa ảnh
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                testID="add-image"
                onPress={() => setSheetOpen(true)}
                style={styles.addImage}
              >
                <Ionicons
                  name="camera-outline"
                  size={21}
                  color={colors.primary}
                />
                <Text style={styles.addImageText}>
                  {preparingImage
                    ? "Đang chuẩn hóa ảnh..."
                    : "Chụp ảnh hoặc Chọn từ thư viện"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.composer}>
          <View
            ref={diagnosisRef}
            testID="tutorial-target-diagnosis"
            collapsable={false}
            style={styles.targetWrap}
          >
            <Pressable
              testID="diagnosis-toggle"
              accessibilityRole="button"
              accessibilityLabel="Chẩn đoán bằng ảnh"
              accessibilityState={{ selected: diagnosisMode }}
              onPress={() => {
                setDiagnosisMode((value) => !value);
                if (!diagnosisMode) setSheetOpen(true);
              }}
              style={[
                styles.diagnosisButton,
                diagnosisMode && styles.diagnosisActive,
              ]}
            >
              <Ionicons
                name="camera"
                size={20}
                color={diagnosisMode ? "#fff" : colors.primaryDark}
              />
              <Text
                style={[
                  styles.diagnosisLabel,
                  diagnosisMode && styles.diagnosisLabelActive,
                ]}
              >
                Chẩn đoán ảnh
              </Text>
            </Pressable>
          </View>
          <View
            ref={composerRef}
            testID="tutorial-target-composer"
            collapsable={false}
            style={styles.inputShell}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              editable={!sending && !loading && !historyLoadError}
              placeholder={
                diagnosisMode
                  ? "Thêm câu hỏi (không bắt buộc)..."
                  : "Nhắn tin cho MaiCare..."
              }
              placeholderTextColor={colors.muted}
              multiline
              maxLength={4000}
              style={styles.input}
            />
            <View
              ref={sendRef}
              testID="tutorial-target-send"
              collapsable={false}
            >
              <Pressable
                testID="chat-send"
                accessibilityLabel={image ? "Gửi chẩn đoán" : "Gửi"}
                disabled={!canSend || (diagnosisMode && !image)}
                onPress={() => void send()}
                style={[
                  styles.send,
                  diagnosisMode && styles.diagnosisSend,
                  (!canSend || (diagnosisMode && !image)) &&
                    styles.sendDisabled,
                ]}
              >
                {diagnosisMode ? (
                  <Text style={styles.diagnosisSendText}>Gửi chẩn đoán</Text>
                ) : (
                  <Ionicons name="arrow-up" size={21} color="#fff" />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <ImageSourceSheet
        visible={sheetOpen}
        error={pickerError}
        onOpenSettings={
          openSettings ? () => void Linking.openSettings() : undefined
        }
        onCamera={() => void takePhoto()}
        onLibrary={() => void chooseGallery()}
        onClose={() => {
          setSheetOpen(false);
          setPickerError("");
          setOpenSettings(false);
        }}
      />
    </SafeAreaView>
  );
}

function Welcome({ onSelect }: { onSelect: (value: string) => void }) {
  return (
    <View style={styles.welcome}>
      <View style={styles.leaf}>
        <Ionicons name="leaf" size={29} color={colors.primary} />
      </View>
      <Text style={styles.welcomeTitle}>Trợ lý chăm sóc mai vàng</Text>
      <Text style={styles.welcomeText}>
        Hỏi về triệu chứng, chăm sóc hoặc bật Chẩn đoán khi bạn muốn gửi ảnh.
      </Text>
      <View style={styles.welcomeChips}>
        {welcomePrompts.map((item) => (
          <Pressable
            key={item}
            onPress={() => onSelect(item)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function MessageBubble({
  message,
  sourceQuestion,
  onSuggestion,
}: {
  message: ChatMessage;
  sourceQuestion: string;
  onSuggestion: (prompt: string) => void;
}) {
  const user = message.role === "user";
  const diagnosis =
    message.role === "assistant" && message.detections !== undefined;
  const showSuggestions =
    message.role === "assistant" &&
    (diagnosis || isWeakContextAnswer(message.content));
  const prompts = showSuggestions
    ? followUpSuggestions(sourceQuestion, diagnosis)
    : [];
  return (
    <View
      testID={user ? "user-message" : "assistant-message"}
      style={[styles.messageRow, user && styles.userRow]}
    >
      <View
        style={[
          styles.bubble,
          user ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            resizeMode="cover"
            style={styles.messageImage}
          />
        )}
        {user && !!message.content && (
          <Text style={styles.userText}>{message.content}</Text>
        )}
        {diagnosis && (
          <View style={styles.diagnosisResult}>
            <Text style={styles.resultTitle}>Kết quả chẩn đoán</Text>
            {message.detections!.length ? (
              message.detections!.map((detection, index) => {
                const name = diseaseLabel(detection.label);
                const confidence = confidenceLabel(detection.confidence);
                return (
                  <View
                    key={`${detection.label}-${index}`}
                    accessibilityLabel={`${name}${confidence ? `, độ tin cậy ${confidence}` : ""}`}
                    style={styles.detectionRow}
                  >
                    <Ionicons
                      name="leaf-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.detectionText}>{name}</Text>
                    {confidence && (
                      <Text style={styles.confidence}>{confidence}</Text>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={styles.noDetection}>
                Không phát hiện rõ lớp bệnh trong ảnh.
              </Text>
            )}
          </View>
        )}
        {!user && <AssistantContent>{message.content}</AssistantContent>}
        {prompts.length > 0 && (
          <View style={styles.followUps}>
            <Text style={styles.followUpTitle}>
              {isWeakContextAnswer(message.content)
                ? "Gợi ý hỏi cụ thể hơn"
                : "Bạn có thể hỏi tiếp"}
            </Text>
            <View style={styles.followUpChips}>
              {prompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  onPress={() => onSuggestion(prompt)}
                  style={styles.followUpChip}
                >
                  <Text style={styles.followUpText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
function RequestError({
  failed,
  busy,
  onRetry,
  onReplace,
  onRemove,
}: {
  failed: FailedRequestState;
  busy: boolean;
  onRetry: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  return (
    <View
      testID="request-error"
      accessibilityRole="alert"
      style={styles.errorCard}
    >
      <View style={styles.errorLine}>
        <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
        <Text style={styles.errorText}>{failed.message}</Text>
      </View>
      <View style={styles.errorActions}>
        <Pressable disabled={busy} onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
        {failed.kind === "image" && (
          <>
            <Pressable onPress={onReplace} style={styles.errorSecondary}>
              <Text style={styles.errorSecondaryText}>Đổi ảnh</Text>
            </Pressable>
            <Pressable onPress={onRemove} style={styles.errorSecondary}>
              <Text style={styles.errorSecondaryText}>Xóa ảnh</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  messageArea: { flex: 1 },
  header: {
    minHeight: 62,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  brand: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  brandTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: "900" },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    maxWidth: "100%",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: spacing.lg,
  },
  muted: { color: colors.muted, fontSize: 13 },
  loadError: { color: colors.text, lineHeight: 21, textAlign: "center" },
  loadRetry: {
    minHeight: 44,
    minWidth: 104,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  loadRetryText: { color: "#fff", fontWeight: "800" },
  list: { paddingHorizontal: 12, paddingVertical: 14, gap: 11 },
  emptyList: { flexGrow: 1 },
  welcome: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  leaf: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginBottom: 12,
  },
  welcomeTitle: { color: colors.primaryDark, fontSize: 21, fontWeight: "900" },
  welcomeText: {
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 320,
  },
  welcomeChips: { width: "100%", gap: 7, marginTop: 17 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, textAlign: "center" },
  messageRow: { flexDirection: "row" },
  userRow: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "90%",
    minWidth: 44,
    padding: 12,
    borderRadius: 18,
    flexShrink: 1,
  },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
  },
  userText: { color: "#fff", fontSize: 15, lineHeight: 22, flexShrink: 1 },
  messageImage: {
    width: 196,
    height: 146,
    maxWidth: "100%",
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    marginBottom: 8,
  },
  diagnosisResult: {
    gap: 7,
    paddingBottom: 11,
    marginBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: "900" },
  detectionRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  detectionText: { flex: 1, color: colors.text, fontWeight: "700" },
  confidence: { color: colors.primaryDark, fontWeight: "900" },
  noDetection: { color: colors.muted, fontStyle: "italic", lineHeight: 20 },
  followUps: {
    gap: 7,
    paddingTop: 11,
    marginTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  followUpTitle: { color: colors.primaryDark, fontWeight: "800", fontSize: 13 },
  followUpChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  followUpChip: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  followUpText: { color: colors.primaryDark, fontSize: 12, lineHeight: 17 },
  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  errorCard: {
    padding: 11,
    gap: 9,
    backgroundColor: colors.dangerSoft,
    borderTopWidth: 1,
    borderTopColor: "#EBCAC6",
  },
  errorLine: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 18 },
  errorActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  retry: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  retryText: { color: "#fff", fontWeight: "800" },
  errorSecondary: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorSecondaryText: { color: colors.danger, fontWeight: "800" },
  diagnosisTray: {
    padding: 10,
    gap: 9,
    backgroundColor: colors.primarySoft,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  trayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trayTitle: { color: colors.primaryDark, fontWeight: "900" },
  traySubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  addImage: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addImageText: { color: colors.primary, fontWeight: "800" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  preview: { width: 68, height: 68, borderRadius: 11 },
  previewActions: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  smallAction: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallActionText: { color: colors.primary, fontWeight: "800" },
  composer: {
    paddingHorizontal: 9,
    paddingTop: 7,
    paddingBottom: Platform.OS === "android" ? 9 : 7,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  targetWrap: { alignSelf: "flex-start" },
  diagnosisButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#9BC7A9",
    backgroundColor: colors.accentSoft,
    shadowColor: "#143725",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  diagnosisActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  diagnosisLabel: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
  },
  diagnosisLabelActive: { color: "#fff" },
  inputShell: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 23,
    backgroundColor: colors.background,
    paddingLeft: 13,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 112,
    paddingTop: 8,
    paddingBottom: 8,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  diagnosisSend: { width: "auto", minWidth: 124, paddingHorizontal: 14 },
  diagnosisSendText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  sendDisabled: { backgroundColor: colors.disabled },
});

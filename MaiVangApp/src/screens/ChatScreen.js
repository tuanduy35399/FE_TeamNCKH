import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { mockHistoryChats, apiUploadImageAndText } from '../services/mockApi';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Load initial mock history
    setMessages(mockHistoryChats.reverse());
  }, []);

  const pickImage = async () => {
    // Ask for permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Cần cấp quyền truy cập thư viện ảnh!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
    setModalVisible(false);
  };

  const takePhoto = async () => {
    // Ask for camera permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Cần cấp quyền truy cập máy ảnh!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
    setModalVisible(false);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    // 1. Add user message to UI immediately
    const newUserMessage = {
      Id: Date.now(),
      Body: inputText,
      ImageUri: selectedImage,
      IsUser: true,
      CreatedAt: new Date().toISOString()
    };
    
    setMessages([newUserMessage, ...messages]);
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    // 2. Call mock API
    try {
      const response = await apiUploadImageAndText(imageToSend, newUserMessage.Body);
      
      // 3. Add AI response to UI
      if (response.success) {
        const aiResponse = {
          Id: Date.now() + 1,
          ModelResult: response.data,
          IsUser: false,
          CreatedAt: new Date().toISOString()
        };
        setMessages(prev => [aiResponse, ...prev]);
      }
    } catch (error) {
      alert("Có lỗi xảy ra khi gửi tin nhắn!");
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.IsUser || !item.ModelResult;
    
    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
        <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleAI]}>
          {isUser ? (
            <>
              {item.ImageUri && <Image source={{ uri: item.ImageUri }} style={styles.messageImage} />}
              {item.Body ? <Text style={styles.messageTextUser}>{item.Body}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.aiResultTitle}>Phát hiện: {item.ModelResult?.NameDetect}</Text>
              {item.ModelResult?.ImgDetect && (
                <Image source={{ uri: item.ModelResult.ImgDetect }} style={styles.messageImage} />
              )}
              {item.ModelResult?.DiseaseDetailId && (
                <TouchableOpacity style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Xem chi tiết bệnh</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.Id.toString()}
        renderItem={renderMessage}
        inverted // Scroll from bottom
        contentContainerStyle={styles.messageList}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>AI đang phân tích...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        {selectedImage && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
              <Text style={styles.removeImageText}>X</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.attachIcon}>📷</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder="Nhập mô tả bệnh..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() && !selectedImage) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() && !selectedImage || isLoading}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Chọn ảnh */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm hình ảnh</Text>
            
            <TouchableOpacity style={styles.modalOptionPrimary} onPress={takePhoto}>
              <Text style={styles.modalOptionTextPrimary}>Chụp ảnh mới</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOptionSecondary} onPress={pickImage}>
              <Text style={styles.modalOptionTextSecondary}>Tải ảnh từ thư viện</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messageList: {
    padding: 15,
  },
  messageWrapper: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAI: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  messageBubbleUser: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  messageBubbleAI: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  messageTextUser: {
    color: '#FFF',
    fontSize: 16,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 5,
  },
  aiResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  detailButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#34C759',
    borderRadius: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  inputContainer: {
    backgroundColor: '#FFF',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  previewContainer: {
    position: 'relative',
    marginBottom: 10,
    width: 100,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    padding: 10,
  },
  attachIcon: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 10,
  },
  sendButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  sendIcon: {
    color: '#FFF',
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOptionPrimary: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalOptionTextPrimary: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  modalOptionSecondary: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 10,
  },
  modalOptionTextSecondary: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalCancel: {
    marginTop: 10,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: 'bold',
  }
});

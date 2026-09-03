import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { colors, radius, spacing } from '../../theme';
import { formatDateTime } from '../../utils/date';
import type { MainStackParamList } from '../../navigation/types';
type Props = NativeStackScreenProps<MainStackParamList, 'HistoryDetail'>;
export function HistoryDetailScreen({ route }: Props) {
  const { item } = route.params;
  return <Screen scroll testID="history-detail"><Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
    {item.body && <Section title="Câu hỏi / mô tả"><Text style={styles.text}>{item.body}</Text></Section>}
    {item.inputImageUrl && <Section title="Hình ảnh đã gửi"><Image source={{ uri: item.inputImageUrl }} style={styles.image} /></Section>}
    {item.result?.nameDetect && <Section title="Kết quả nhận diện"><Text style={styles.detect}>{item.result.nameDetect}</Text></Section>}
    {item.result?.detectedImageUrl && <Section title="Ảnh đã đánh dấu"><Image source={{ uri: item.result.detectedImageUrl }} style={styles.image} /></Section>}
    {item.result?.answer && <Section title="Tư vấn"><Text style={styles.text}>{item.result.answer}</Text></Section>}
    {item.result?.disease && <Section title={item.result.disease.name}><Text style={styles.text}>{item.result.disease.information}</Text>{item.result.disease.imageUrl && <Image source={{ uri: item.result.disease.imageUrl }} style={styles.image} />}</Section>}
  </Screen>;
}
function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <View style={styles.section}><Text style={styles.title}>{title}</Text>{children}</View>;
}
const styles = StyleSheet.create({
  date: { color: colors.muted, marginBottom: spacing.md }, section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.primaryDark, fontSize: 17, fontWeight: '800' }, text: { color: colors.text, lineHeight: 23 }, detect: { color: colors.primary, fontSize: 18, fontWeight: '700' }, image: { width: '100%', aspectRatio: 1.25, borderRadius: radius.md, backgroundColor: colors.border },
});

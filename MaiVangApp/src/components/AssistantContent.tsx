import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { parseAssistantContent, type AssistantInline } from './assistantMarkdown';

function InlineContent({ items }: { items: AssistantInline[] }) {
  return <>{items.map((item, index) => <Text
    key={`${item.text}-${index}`}
    accessibilityRole={item.url ? 'link' : undefined}
    onPress={item.url ? () => void Linking.openURL(item.url!) : undefined}
    style={[item.emphasis === 'bold' && styles.bold, item.emphasis === 'italic' && styles.italic, item.emphasis === 'code' && styles.code, item.url && styles.link]}
  >{item.text}</Text>)}</>;
}

export function AssistantContent({ children, testID }: { children: string; testID?: string }) {
  const blocks = parseAssistantContent(children);
  return <View testID={testID} accessibilityLabel={blocks.map(block => block.inlines.map(item => item.text).join('')).join('\n')} style={styles.container}>
    {blocks.map((block, index) => {
      if (block.kind === 'bullet' || block.kind === 'numbered') return <View key={index} style={styles.listRow}><Text style={styles.marker}>{block.kind === 'bullet' ? '•' : `${block.number}.`}</Text><Text style={styles.body}><InlineContent items={block.inlines} /></Text></View>;
      return <Text key={index} style={block.kind === 'heading' ? [styles.heading, (block.level ?? 1) > 1 ? styles.subheading : undefined] : styles.body}><InlineContent items={block.inlines} /></Text>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  body: { flexShrink: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  heading: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, marginTop: 2 },
  subheading: { fontSize: 17, lineHeight: 23 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  marker: { width: 22, color: colors.primaryDark, fontFamily: fonts.medium, fontSize: 15, lineHeight: 23, textAlign: 'right' },
  bold: { fontFamily: fonts.bold },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: fonts.medium, color: colors.primaryDark, backgroundColor: colors.primarySoft },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});

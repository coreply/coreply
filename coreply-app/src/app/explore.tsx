import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AdvancedScreen() {
	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<ThemedText type="title" style={styles.title}>
						Phase 1 Notes
					</ThemedText>
					<ThemedView type="backgroundElement" style={styles.card}>
						<ThemedText type="subtitle">Current Split</ThemedText>
						<ThemedText type="small">Settings UI is now in Expo/React Native.</ThemedText>
						<ThemedText type="small">Accessibility, app detection, and overlay insertion remain native Kotlin.</ThemedText>
						<ThemedText type="small">Suggestion generation now routes through the Android WebView wrapper and `libcoreply`.</ThemedText>
					</ThemedView>
					<ThemedView type="backgroundElement" style={styles.card}>
						<ThemedText type="subtitle">Manual Follow-up</ThemedText>
						<ThemedText type="small">You said Gradle/build debugging stays with you, so this screen intentionally summarizes the migration state instead of hiding rough edges.</ThemedText>
					</ThemedView>
				</ScrollView>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		flexDirection: 'row',
	},
	safeArea: {
		flex: 1,
		paddingHorizontal: Spacing.three,
		paddingBottom: BottomTabInset + Spacing.three,
		maxWidth: MaxContentWidth,
	},
	scrollContent: {
		paddingVertical: Spacing.three,
		gap: Spacing.three,
	},
	title: {
		fontSize: 36,
		lineHeight: 40,
	},
	card: {
		padding: Spacing.three,
		borderRadius: Spacing.three,
		gap: Spacing.two,
	},
});

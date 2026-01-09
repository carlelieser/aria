import {SafeAreaView} from "react-native-safe-area-context";
import {Input} from "@/components/ui/input";
import {ScrollView, View, ActivityIndicator} from "react-native";
import {Icon} from "@/components/ui/icon";
import {ArrowLeftIcon, SearchIcon, SearchXIcon} from "lucide-react-native";
import {TrackListItem} from "@/components/track-list-item";
import {Button} from "@/components/ui/button";
import {Text} from "@/components/ui/text";
import {router} from "expo-router";
import {useSearch} from "@/hooks/use-search";
import {EmptyState} from "@/app/index";

export default function SearchScreen() {
	const { query, tracks, isSearching, error, search } = useSearch();

	return (
		<SafeAreaView className="bg-background flex-1">
			<View className="p-4 bg-secondary items-start gap-4 rounded-b-3xl">
				<Button size="sm" variant="default" onPress={() => router.back()}>
					<Icon as={ArrowLeftIcon} className="text-primary-foreground"/>
					<Text>Back</Text>
				</Button>
				<View className="flex-row items-center w-full">
					<Icon as={SearchIcon} size={24}/>
					<Input
						value={query}
						onChangeText={search}
						className="border-none border-0 bg-transparent flex-1"
						keyboardType="default"
						textContentType="none"
						placeholder="Search music"
						autoFocus={true}
					/>
				</View>
			</View>

			<ScrollView contentContainerClassName="gap-2 p-4 py-4">
				{isSearching && (
					<View className="py-8 items-center">
						<ActivityIndicator size="large" />
						<Text variant="muted" className="mt-4">Searching...</Text>
					</View>
				)}

				{error && !isSearching && (
					<View className="py-8 items-center">
						<Text className="text-destructive">Error: {error}</Text>
					</View>
				)}

				{!isSearching && !error && tracks.length === 0 && query.trim() !== "" && (
					<EmptyState
						icon={SearchXIcon}
						title="No results found"
						description="Try searching for something else"
					/>
				)}

				{!isSearching && !error && tracks.length === 0 && query.trim() === "" && (
					<EmptyState
						icon={SearchIcon}
						title="Search for music"
						description="Find songs, artists, and playlists"
					/>
				)}

				{tracks.map(track => (
					<TrackListItem key={track.id.value} track={track} />
				))}
			</ScrollView>
		</SafeAreaView>
	);
}
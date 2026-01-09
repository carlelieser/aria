import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Input} from "@/components/ui/input";
import {ScrollView, View} from "react-native";
import {Icon} from "@/components/ui/icon";
import {SearchIcon, SearchXIcon, XIcon} from "lucide-react-native";
import {TrackListItem} from "@/components/track-list-item";
import {Button} from "@/components/ui/button";
import {Text} from "@/components/ui/text";
import {router} from "expo-router";
import {useSearch} from "@/hooks/use-search";
import {EmptyState} from "@/app/index";
import {TrackListSkeleton} from "@/components/skeletons";

export default function SearchScreen() {
	const insets = useSafeAreaInsets();
	const { query, tracks, isSearching, error, search } = useSearch();

	return (
		<View className="bg-background flex-1">
			<View
				className="px-4 pb-4 bg-secondary items-start gap-4 rounded-b-3xl"
				style={{ paddingTop: insets.top + 16 }}
			>
				<View className={"flex-row justify-end w-full"}>
					<Button size="icon" variant="default" onPress={() => router.back()}>
						<Icon as={XIcon} className="text-primary-foreground"/>
					</Button>
				</View>
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

			<ScrollView
				contentContainerClassName="gap-2 p-4 py-4"
				contentContainerStyle={{ paddingBottom: insets.bottom }}
			>
				{isSearching && (
					<TrackListSkeleton count={6} />
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
					<TrackListItem key={track.id.value} track={track} source="search" />
				))}
			</ScrollView>
		</View>
	);
}

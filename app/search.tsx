import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Input} from '@/components/ui/input';
import {ScrollView, View} from 'react-native';
import {Icon} from '@/components/ui/icon';
import {
    SearchIcon,
    SearchXIcon,
    XIcon,
    HeartIcon,
    ClockIcon,
    SparklesIcon,
    CompassIcon, ArrowLeftIcon, ChevronLeftIcon,
} from 'lucide-react-native';
import {TrackListItem} from '@/components/track-list-item';
import {TrackCard} from '@/components/track-card';
import {Button} from '@/components/ui/button';
import {Text} from '@/components/ui/text';
import {router} from 'expo-router';
import {useSearch} from '@/hooks/use-search';
import {EmptyState} from '@/app/index';
import {TrackListSkeleton} from '@/components/skeletons';
import {useRecentlyPlayed, useHasHistory} from '@/src/application/state/history-store';
import {useFavoriteTracks, useTracks} from '@/src/application/state/library-store';
import type {Track} from '@/src/domain/entities/track';
import type {LucideIcon} from 'lucide-react-native';

interface ExploreSectionProps {
    id: string;
    title: string;
    icon: LucideIcon;
    tracks: Track[];
    showSeeAll?: boolean;
    onSeeAll?: () => void;
}

function ExploreSection({id, title, icon: IconComponent, tracks, showSeeAll, onSeeAll}: ExploreSectionProps) {
    if (tracks.length === 0) return null;

    return (
        <View className="gap-3">
            <View className="flex-row items-center justify-between px-4">
                <View className="flex-row items-center gap-2">
                    <Icon as={IconComponent} size={18} className="text-muted-foreground"/>
                    <Text className="font-semibold text-lg">{title}</Text>
                </View>
                {showSeeAll && onSeeAll && (
                    <Button variant="ghost" size="sm" onPress={onSeeAll}>
                        <Text variant="muted" className="text-sm">See all</Text>
                    </Button>
                )}
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-4 px-4"
            >
                {tracks.map((track) => (
                    <TrackCard key={`${id}-${track.id.value}`} track={track}/>
                ))}
            </ScrollView>
        </View>
    );
}

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const {query, tracks, isSearching, error, search} = useSearch();

    const recentlyPlayed = useRecentlyPlayed(10);
    const favoriteTracks = useFavoriteTracks();
    const libraryTracks = useTracks();
    const hasHistory = useHasHistory();

    // Get recently added tracks (last 10 from library, sorted by addedAt if available)
    const recentlyAdded = [...libraryTracks]
        .sort((a, b) => {
            const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, 10);

    const isExploreMode = query.trim() === '';
    const hasExploreContent = hasHistory || favoriteTracks.length > 0 || recentlyAdded.length > 0;

    return (
        <View className="bg-background flex-1">
            <View
                className="px-4 pb-4 bg-secondary items-start gap-4 rounded-b-3xl"
                style={{paddingTop: insets.top + 16}}
            >
                <View className="flex-row justify-between items-center w-full">
                    <View className="flex-row items-center gap-2">
                        <Button className={"opacity-50"} size="icon" variant="secondary" onPress={() => router.back()}>
                            <Icon as={ChevronLeftIcon}/>
                        </Button>
                        <Text className="text-2xl font-bold">Explore</Text>
                    </View>
                </View>
                <View className="flex-row items-center w-full">
                    <Input
                        value={query}
                        onChangeText={search}
                        className="border-none border-0 bg-transparent flex-1 px-0"
                        keyboardType="default"
                        textContentType="none"
                        placeholder="Search music"
                        autoFocus={false}
                    />
                </View>
            </View>

            <ScrollView
                contentContainerClassName="gap-6 py-6"
                contentContainerStyle={{paddingBottom: insets.bottom + 80}}
            >
                {/* Search Results Mode */}
                {!isExploreMode && (
                    <View className="px-4">
                        {isSearching && <TrackListSkeleton count={6}/>}

                        {error && !isSearching && (
                            <View className="py-8 items-center">
                                <Text className="text-destructive">Error: {error}</Text>
                            </View>
                        )}

                        {!isSearching && !error && tracks.length === 0 && (
                            <EmptyState
                                icon={SearchXIcon}
                                title="No results found"
                                description="Try searching for something else"
                            />
                        )}

                        {!isSearching && !error && tracks.length > 0 && (
                            <View className="gap-2">
                                {tracks.map((track) => (
                                    <TrackListItem key={track.id.value} track={track} source="search"/>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Explore Mode */}
                {isExploreMode && (
                    <>
                        {!hasExploreContent && (
                            <View className="px-4 pt-8">
                                <EmptyState
                                    icon={SparklesIcon}
                                    title="Start exploring"
                                    description="Search for music or play some tracks to see your recent activity here"
                                />
                            </View>
                        )}

                        {hasExploreContent && (
                            <>
                                <ExploreSection
                                    id="recently-played"
                                    title="Recently Played"
                                    icon={ClockIcon}
                                    tracks={recentlyPlayed}
                                />

                                <ExploreSection
                                    id="favorites"
                                    title="Favorites"
                                    icon={HeartIcon}
                                    tracks={favoriteTracks}
                                />

                                {recentlyAdded.length > 0 && (
                                    <ExploreSection
                                        id="recently-added"
                                        title="Recently Added"
                                        icon={SparklesIcon}
                                        tracks={recentlyAdded}
                                    />
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

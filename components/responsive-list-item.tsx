import { MusicResponsiveListItem } from '@/node_modules/youtubei.js/dist/src/parser/nodes';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/text';
import { useContext } from 'react';
import { AppContext } from '@/contexts/app';
import { router } from 'expo-router';

export function ResponsiveListItem(props: { data: MusicResponsiveListItem }) {
	const context = useContext(AppContext);
	if (props.data.item_type === 'song') {
		return (
			<TouchableOpacity
				className={'flex flex-row items-center w-full gap-4 py-4'}
				onPress={() => {
					context.setPlaying(props.data);
					router.navigate('/player');
				}}
			>
				<Image
					source={{
						uri: props.data.thumbnail?.contents[0].url,
					}}
					style={{
						width: 48,
						height: 48,
						borderRadius: 12,
					}}
				/>
				<View className={'flex flex-col gap-1 flex-1'}>
					<Text>{props.data.title}</Text>
					<Text variant={'muted'}>
						{props.data.artists?.map((artist) => artist.name).join(', ')} ·{' '}
						{props.data.album?.name}
					</Text>
				</View>
			</TouchableOpacity>
		);
	}

	return null;
}

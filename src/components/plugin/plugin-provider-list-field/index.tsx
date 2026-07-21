/**
 * PluginProviderListField Component
 *
 * Config field for enabling and ordering a plugin's providers. Opens a sheet
 * of MovableItem rows (toggle enabled + reorder priority), mirroring the tab
 * order setting. The available providers are read from the plugin instance;
 * the enabled set and order are persisted under the field's config key.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ListOrderedIcon } from 'lucide-react-native';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { SettingsBottomSheet } from '@/src/components/settings/settings-bottom-sheet';
import { MovableItem } from '@/src/components/ui/movable-item';
import { EmptyState } from '@/src/components/ui/empty-state';
import { getTypedPlugin } from '@/src/hooks/use-plugin-registry';
import type { PluginProviderListFieldProps, ProviderListValue } from './types';

export type { PluginProviderListFieldProps } from './types';

interface Provider {
	readonly id: string;
	readonly name: string;
}

interface ProviderListPlugin {
	getProviders(): Provider[];
}

/** Order `providers` by the saved order, appending any not yet listed. */
function orderProviders(providers: Provider[], order: string[]): Provider[] {
	const byId = new Map(providers.map((p) => [p.id, p]));
	const ordered = order.map((id) => byId.get(id)).filter((p): p is Provider => p !== undefined);
	const seen = new Set(order);
	return [...ordered, ...providers.filter((p) => !seen.has(p.id))];
}

export const PluginProviderListField = memo(function PluginProviderListField({
	schema,
	value,
	onChange,
	pluginId,
}: PluginProviderListFieldProps) {
	const [isOpen, setIsOpen] = useState(false);

	const providers = useMemo(() => {
		const plugin = getTypedPlugin<ProviderListPlugin>(pluginId);
		return plugin?.getProviders() ?? [];
	}, [pluginId]);

	const ordered = useMemo(() => orderProviders(providers, value.order), [providers, value.order]);

	const commit = useCallback(
		(next: ProviderListValue) => onChange(schema.key, next),
		[onChange, schema.key]
	);

	const handleToggle = useCallback(
		(id: string) => {
			const enabled = value.enabled.includes(id)
				? value.enabled.filter((p) => p !== id)
				: [...value.enabled, id];
			commit({ enabled, order: value.order });
		},
		[value, commit]
	);

	const handleMove = useCallback(
		(index: number, delta: number) => {
			const order = ordered.map((p) => p.id);
			const target = index + delta;
			if (target < 0 || target >= order.length) return;
			[order[index], order[target]] = [order[target], order[index]];
			commit({ enabled: value.enabled, order });
		},
		[ordered, value.enabled, commit]
	);

	const summary =
		ordered
			.filter((p) => value.enabled.includes(p.id))
			.map((p) => p.name)
			.join(', ') || 'None enabled';

	return (
		<>
			<SettingsItem
				icon={ListOrderedIcon}
				title={schema.label}
				subtitle={summary}
				onPress={() => setIsOpen(true)}
				showChevron
			/>

			<SettingsBottomSheet
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				portalName={`plugin-${pluginId}-${schema.key}`}
				title={schema.label}
			>
				{ordered.length === 0 ? (
					<EmptyState icon={ListOrderedIcon} title={'No providers available'} />
				) : (
					<View style={styles.list}>
						{ordered.map((provider, index) => (
							<MovableItem
								key={provider.id}
								label={provider.name}
								enabled={value.enabled.includes(provider.id)}
								isFirst={index === 0}
								isLast={index === ordered.length - 1}
								onToggle={() => handleToggle(provider.id)}
								onMoveUp={() => handleMove(index, -1)}
								onMoveDown={() => handleMove(index, 1)}
							/>
						))}
					</View>
				)}
			</SettingsBottomSheet>
		</>
	);
});

const styles = StyleSheet.create({
	list: {
		gap: 8,
	},
});

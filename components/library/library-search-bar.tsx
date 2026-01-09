import { View } from 'react-native';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Search, X } from 'lucide-react-native';

interface LibrarySearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function LibrarySearchBar({
  value,
  onChangeText,
  placeholder = 'Search your library...',
}: LibrarySearchBarProps) {
  const hasValue = value.length > 0;

  return (
    <View className="flex-row items-center px-4 gap-2">
      <View className="flex-1 flex-row items-center bg-secondary rounded-lg px-3 gap-2">
        <Icon as={Search} size={18} className="text-muted-foreground" />
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          className="flex-1 border-0 bg-transparent px-0"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {hasValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => onChangeText('')}
          >
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Button>
        )}
      </View>
    </View>
  );
}

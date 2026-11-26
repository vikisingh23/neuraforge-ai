# Generation Patterns — templates

Loaded on demand by the `rn-forge` agent. Moved out of `agents/rn-forge.md` so the agent prompt stays small.

## Template 1

```typescript
import React from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useUserProfile } from '../hooks/useUserProfile';
import { RootStackParamList } from '../navigation/types';

type RouteProps = RouteProp<RootStackParamList, 'UserProfile'>;

export const UserProfileScreen = () => {
  const { params: { userId } } = useRoute<RouteProps>();
  const { data: userProfile, isLoading, error } = useUserProfile(userId);

  if (isLoading) return <ActivityIndicator style={styles.loader} size="large" />;
  if (error) return <Text style={styles.error}>Failed to load profile</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.name}>{userProfile.fullName}</Text>
      <Text style={styles.email}>{userProfile.email}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
  error: { flex: 1, textAlign: 'center', marginTop: 40, color: '#d32f2f' },
});
```

## Template 2

```typescript
import React, { useCallback } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTransactionList } from '../hooks/useTransactionList';
import { TransactionItem } from '../components/TransactionItem';

const ITEM_HEIGHT = 72;

export const TransactionListScreen = () => {
  const { data, isLoading, refetch, isRefetching } = useTransactionList();

  const renderItem = useCallback(
    ({ item }) => <TransactionItem transaction={item} />,
    [],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data?.transactions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? <ActivityIndicator /> : <Text>No transactions</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
```

## Template 3

```typescript
import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileForm } from '../hooks/useProfileForm';

export const EditProfileScreen = () => {
  const { formData, errors, isSubmitting, handleChange, handleSubmit } = useProfileForm();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={v => handleChange('name', v)}
            placeholder="Enter full name"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 16,
  },
  inputError: { borderColor: '#d32f2f' },
  errorText: { color: '#d32f2f', fontSize: 12, marginTop: -12, marginBottom: 16 },
  button: {
    backgroundColor: '#1976d2', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

## Template 4

```typescript
import { useQuery } from '@tanstack/react-query';
import { userKeys } from '../queries/userQueries';
import { userService } from '../services/userService';

export const useUserProfile = (userId: string) =>
  useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getProfile(userId),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
```

## Template 5

```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userKeys } from '../queries/userQueries';
import { userService } from '../services/userService';

export const useProfileForm = (userId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => userService.updateProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      onSuccess?.();
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    mutation.mutate(formData);
  };

  return { formData, errors, isSubmitting: mutation.isPending, handleChange, handleSubmit };
};
```

## Template 6

```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
```

## Template 7

```typescript
import { useQuery } from '@tanstack/react-query';
import { useNetInfo } from '@react-native-community/netinfo';

export const useOfflineAwareQuery = <T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  staleTime = 5 * 60 * 1000,
) => {
  const { isConnected } = useNetInfo();

  return useQuery({
    queryKey,
    queryFn,
    enabled: isConnected !== false,
    staleTime: isConnected ? staleTime : Infinity,
  });
};
```

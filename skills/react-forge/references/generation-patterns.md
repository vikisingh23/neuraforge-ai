# Generation Patterns — templates

Loaded on demand by the `react-forge` agent. Moved out of `agents/react-forge.md` so the agent prompt stays small.

## Template 1

```javascript
import React from 'react';
import { useUserProfile } from '../hooks/useUserProfile';

export const UserProfile = ({ userId }) => {
  const { data: userProfile, isLoading, error } = useUserProfile(userId);

  if (isLoading) return <div>Loading user profile...</div>;
  if (error) return <div>Error loading profile</div>;

  return (
    <div className="user-profile">
      <h2>{userProfile.fullName}</h2>
      <p>{userProfile.email}</p>
    </div>
  );
};
```

## Template 2

```javascript
import { queryOptions } from '@tanstack/react-query';
import { userApi } from '../services/userApi';

export const userKeys = {
  all: ['users'],
  detail: (userId) => [...userKeys.all, 'detail', userId],
  list: (filters) => [...userKeys.all, 'list', filters],
};

export const userQueryOptions = {
  detail: (userId) =>
    queryOptions({
      queryKey: userKeys.detail(userId),
      queryFn: () => userApi.getDetail(userId),
      staleTime: 5 * 60 * 1000,
      enabled: !!userId,
    }),
};
```

## Template 3

```javascript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useUserForm = (userId, onSuccess) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});

  const updateMutation = useMutation({
    mutationFn: (data) => userApi.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      onSuccess?.();
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    await updateMutation.mutateAsync(formData);
  };

  return { formData, errors, isSubmitting: updateMutation.isPending, handleChange, handleSubmit };
};
```

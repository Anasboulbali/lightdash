import { ApiError } from '@lightdash/common';
import { Button, PasswordInput, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { FC, useCallback } from 'react';
import { useMutation } from 'react-query';
import { lightdashApi } from '../../../api';
import useUserHasPassword from '../../../hooks/user/usePassword';
import { useErrorLogs } from '../../../providers/ErrorLogsProvider';

const updateUserPasswordQuery = async (data: {
    password: string;
    newPassword: string;
}) =>
    lightdashApi<undefined>({
        url: `/user/password`,
        method: 'POST',
        body: JSON.stringify(data),
    });

const PasswordPanel: FC = () => {
    const { data: hasPassword } = useUserHasPassword();
    const { showError } = useErrorLogs();
    const form = useForm({
        initialValues: {
            currentPassword: '',
            newPassword: '',
        },
    });

    const { isLoading, mutate: updateUserPassword } = useMutation<
        undefined,
        ApiError,
        { password: string; newPassword: string }
    >(updateUserPasswordQuery, {
        mutationKey: ['user_password_update'],
        onSuccess: () => {
            window.location.href = '/login';
        },
        onError: useCallback(
            (error) => {
                const [title, ...rest] = error.error.message.split('\n');
                showError({
                    title,
                    body: rest.join('\n'),
                });
            },
            [showError],
        ),
    });

    const handleOnSubmit = form.onSubmit(({ currentPassword, newPassword }) => {
        updateUserPassword({
            password: hasPassword ? currentPassword : '',
            newPassword,
        });
    });

    return (
        <form onSubmit={handleOnSubmit}>
            <Stack mt="md">
                {hasPassword && (
                    <PasswordInput
                        label="Current password"
                        placeholder="Enter your password..."
                        required
                        disabled={isLoading}
                        {...form.getInputProps('currentPassword')}
                    />
                )}
                <PasswordInput
                    label="New password"
                    placeholder="Enter your new password..."
                    required
                    disabled={isLoading}
                    {...form.getInputProps('newPassword')}
                />

                <Button
                    type="submit"
                    ml="auto"
                    display="block"
                    loading={isLoading}
                >
                    Update
                </Button>
            </Stack>
        </form>
    );
};

export default PasswordPanel;

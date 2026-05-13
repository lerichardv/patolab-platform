import { Head } from '@inertiajs/react';
import UpdateProfileInformationForm from './partials/update-profile-information-form';
import DeleteUserForm from './partials/delete-user-form';

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    return (
        <>
            <Head title="Perfil" />
            <div className="space-y-6">
                <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                <DeleteUserForm />
            </div>
        </>
    );
}

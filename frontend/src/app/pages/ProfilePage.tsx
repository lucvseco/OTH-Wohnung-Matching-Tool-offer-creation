import { useAuth } from '../context/AuthContext';
import { User, Mail, Calendar, Briefcase } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const getGenderLabel = (gender: string) => {
    const labels = { male: 'Male', female: 'Female', diverse: 'Diverse' };
    return labels[gender as keyof typeof labels] || gender;
  };

  const getRoleLabel = (role: string) => {
    const labels = { student: 'Student', worker: 'Employee' };
    return labels[role as keyof typeof labels] || role;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Account information imported from OTH Portal</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Mail size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </div>
              <p className="text-gray-900 ml-8">{user.email}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Role</span>
              </div>
              <p className="text-gray-900 ml-8">{getRoleLabel(user.role)}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <User size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Gender</span>
              </div>
              <p className="text-gray-900 ml-8">{getGenderLabel(user.gender)}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Date of Birth</span>
              </div>
              <p className="text-gray-900 ml-8">
                {new Date(user.dateOfBirth).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Note:</span> This information is automatically imported from your OTH Regensburg portal account and cannot be edited here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

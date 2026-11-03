import {Outlet, Link, useNavigate} from 'react-router';
import {useAuth} from '../context/AuthContext';
import {useChats} from '../context/ChatsContext';
import {Home, PlusCircle, User, LogOut, MessageCircle, FileText} from 'lucide-react';
import {NotificationDropdown} from './NotificationDropdown';

export function Layout() {
    const {user, logout, isAuthenticated} = useAuth();
    const {chats} = useChats();
    const navigate = useNavigate();

    //calculate total unread messages count to display the unread messages badge
    const totalUnreadCount = chats.reduce(
        (acc, chat) => acc + (chat.unreadCount || 0),
        0
    );

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!isAuthenticated) {
        return <Outlet/>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">OTH</span>
                            </div>
                            <span className="font-semibold text-gray-900">Housing Match</span>
                        </Link>

                        <nav className="flex items-center gap-6">
                            <Link
                                to="/"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <Home size={20}/>
                                <span>Feed</span>
                            </Link>
                            <Link
                                to="/my-offers"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <PlusCircle size={20}/>
                                <span>My Offers</span>
                            </Link>
                            <Link
                                to="/my-applications"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <FileText size={20}/>
                                <span>My Applications</span>
                            </Link>
                            <Link
                                to="/chats"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <div className="relative inline-flex items-center">
                                    <MessageCircle size={20}/>
                                    {totalUnreadCount > 0 && (
                                        <span
                                            className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none shadow-sm">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
                                    )}
                                </div>
                                <span>Chats</span>
                            </Link>
                            <div className="flex items-center gap-4 ml-4 pl-4 border-l">
                                <NotificationDropdown/>
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <User size={20}/>
                                    <span className="text-sm">{user?.name}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
                                >
                                    <LogOut size={20}/>
                                </button>
                            </div>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet/>
            </main>
        </div>
    );
}

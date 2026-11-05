import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Edit3,
  FileText,
  Sliders,
  Sparkles,
  Shield,
  HelpCircle,
  LogOut,
  ChevronDown,
  ShieldAlert,
  CreditCard,
  Check,
  Camera
} from 'lucide-react';
import { AuthUser } from '../services/api.ts';
import { DashboardTab } from './DashboardShell.tsx';
import { RoyalCrownLogo } from './RoyalCrownLogo.tsx';
import { ProfilePhotoCropModal } from './ProfilePhotoCropModal.tsx';

export interface ProfileIdentityComponentProps {
  user: AuthUser;
  plan?: 'free' | 'pro' | 'black';
  isFounderAccount?: boolean;
  isAdmin?: boolean;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenSettingsModal: () => void;
  onOpenPrivacy: () => void;
  onOpenPricing: () => void;
  onOpenAbout: () => void;
  onOpenAdmin?: () => void;
  onLogout: () => void;
  onUpdateUserPhoto?: (photoUrl: string | null) => Promise<void> | void;
}

export function getUserInitials(fullName?: string, email?: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export const ProfileIdentityComponent: React.FC<ProfileIdentityComponentProps> = ({
  user,
  plan = 'free',
  isFounderAccount = false,
  isAdmin = false,
  onSelectTab,
  onOpenSettingsModal,
  onOpenPrivacy,
  onOpenPricing,
  onOpenAbout,
  onOpenAdmin,
  onLogout,
  onUpdateUserPhoto,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [selectedFileForCrop, setSelectedFileForCrop] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isBlack = plan === 'black';

  // Resolve user photo (from user prop or localStorage)
  const storedPhoto = typeof localStorage !== 'undefined'
    ? localStorage.getItem(`applyvise_user_photo_${user.id}`)
    : null;
  const photoUrl = !photoError ? (user.photoUrl || (user as any).avatarUrl || storedPhoto) : null;
  const initials = getUserInitials(user.fullName, user.email);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation & accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      const totalItems = itemRefs.current.filter(Boolean).length;
      if (totalItems === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = prev + 1 >= totalItems ? 0 : prev + 1;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = prev - 1 < 0 ? totalItems - 1 : prev - 1;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (event.key === 'Home') {
        event.preventDefault();
        setFocusedIndex(0);
        itemRefs.current[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        setFocusedIndex(totalItems - 1);
        itemRefs.current[totalItems - 1]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Construct menu items strictly matching existing application actions
  interface MenuItemConfig {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    isDestructive?: boolean;
    isAdminOnly?: boolean;
    badge?: string;
  }

  const menuItems: MenuItemConfig[] = [
    {
      id: 'profile_overview',
      label: 'Profile Overview',
      icon: User,
      action: () => onSelectTab('overview'),
    },
    {
      id: 'edit_profile',
      label: 'Edit Profile',
      icon: Edit3,
      action: () => onSelectTab('profile'),
    },
    {
      id: 'resume_career',
      label: 'Resume & Career Information',
      icon: FileText,
      action: () => onSelectTab('resume_intelligence'),
    },
    {
      id: 'account_settings',
      label: 'Account Settings',
      icon: Sliders,
      action: () => onOpenSettingsModal(),
    },
    {
      id: 'subscription_membership',
      label: 'Subscription & Membership',
      icon: isBlack ? Sparkles : CreditCard,
      badge: isBlack ? 'ELITE' : plan.toUpperCase(),
      action: () => onOpenPricing(),
    },
    {
      id: 'security_privacy',
      label: 'Security & Privacy',
      icon: Shield,
      action: () => onOpenPrivacy(),
    },
    {
      id: 'help_support',
      label: 'Help & Support',
      icon: HelpCircle,
      action: () => onOpenAbout(),
    },
  ];

  if (isAdmin && onOpenAdmin) {
    menuItems.push({
      id: 'admin_console',
      label: 'Administrator Console',
      icon: ShieldAlert,
      isAdminOnly: true,
      action: () => onOpenAdmin(),
    });
  }

  menuItems.push({
    id: 'sign_out',
    label: 'Sign Out',
    icon: LogOut,
    isDestructive: true,
    action: () => onLogout(),
  });

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* 1. Main Profile Trigger Button (Executive Alignment) */}
      <button
        ref={triggerRef}
        type="button"
        id="user-profile-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.fullName || user.email}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setFocusedIndex(-1);
        }}
        className={`group flex items-center space-x-2.5 p-1.5 pr-2.5 sm:pr-3 rounded-2xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 ${
          isBlack
            ? 'bg-[#14171C] hover:bg-[#191D23] active:bg-[#111318] border border-[rgba(255,255,255,0.09)] hover:border-[rgba(198,166,106,0.30)] shadow-xs focus:ring-[#C6A66A]/40'
            : 'bg-white/80 hover:bg-white active:bg-slate-50 border border-slate-200/90 hover:border-slate-300 shadow-2xs focus:ring-blue-500/40'
        }`}
      >
        {/* Profile Avatar (Consistent Dimensions & Theme Border) */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-xs sm:text-sm overflow-hidden transition-all duration-200 ${
            isBlack
              ? 'bg-[#111318] text-[#C6A66A] border border-[rgba(198,166,106,0.30)] shadow-xs group-hover:border-[#C6A66A]'
              : plan === 'pro'
              ? 'bg-gradient-to-tr from-blue-600 to-[#8065F5] text-white border border-blue-200 shadow-xs'
              : 'bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
          }`}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={user.fullName || 'User Avatar'}
              onError={() => setPhotoError(true)}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="tracking-tight select-none">{initials}</span>
          )}
        </div>

        {/* Identity & Membership Block */}
        <div className="flex flex-col text-left min-w-0 pr-1">
          {/* User Full Name (Clean medium-to-semibold typography, NO crown directly beside name) */}
          <span
            className={`font-semibold text-xs sm:text-sm truncate max-w-[110px] sm:max-w-[150px] md:max-w-[180px] leading-tight transition-colors ${
              isBlack
                ? 'text-[#F2F0EA] group-hover:text-[#F2F0EA]'
                : 'text-slate-900 group-hover:text-blue-600'
            }`}
          >
            {user.fullName || 'User'}
          </span>

          {/* Compact Membership Badge (Placed cleanly below name) */}
          <div className="mt-0.5">
            {isBlack ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase font-medium bg-[#111318] text-[#C6A66A] border border-[rgba(198,166,106,0.25)] select-none">
                <RoyalCrownLogo size="xs" />
                <span>BLACK ELITE</span>
              </span>
            ) : isFounderAccount ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-violet-50 text-violet-700 border border-violet-200 select-none">
                <Sparkles className="h-2.5 w-2.5" />
                <span>FOUNDER ACCESS</span>
              </span>
            ) : plan === 'pro' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200 select-none">
                <span>PRO MEMBER</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200 select-none">
                <span>FREE MEMBER</span>
              </span>
            )}
          </div>
        </div>

        {/* Dropdown Chevron (Far right, vertically centered) */}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${
            isBlack
              ? 'text-[#92949A] group-hover:text-[#F2F0EA]'
              : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
      </button>

      {/* 2. Premium Dropdown Menu Container */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-profile-menu-button"
          className={`absolute right-0 mt-2.5 w-72 max-w-[calc(100vw-2rem)] rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 focus:outline-none shadow-2xl ${
            isBlack
              ? 'bg-[#14171C] border border-[rgba(255,255,255,0.12)] shadow-black/85 text-[#F2F0EA]'
              : 'bg-white/95 backdrop-blur-2xl border border-slate-200/90 text-slate-900 shadow-slate-900/10'
          }`}
        >
          {/* Dropdown Account Header */}
          <div
            className={`p-3.5 rounded-xl border mb-1.5 flex items-center space-x-3 ${
              isBlack
                ? 'bg-[#191D23] border-[rgba(255,255,255,0.06)]'
                : 'bg-slate-50/80 border-slate-100'
            }`}
          >
            <div className="relative group/avatar shrink-0">
              <div
                className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-bold text-sm overflow-hidden ${
                  isBlack
                    ? 'bg-[#111318] text-[#C6A66A] border border-[rgba(198,166,106,0.30)]'
                    : 'bg-gradient-to-tr from-blue-600 to-[#8065F5] text-white border border-blue-200'
                }`}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={user.fullName || 'User'}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                title="Change profile photograph"
                aria-label="Change profile photograph"
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#14171C] border border-[rgba(198,166,106,0.35)] text-[#C6A66A] hover:bg-[#C6A66A] hover:text-[#17130C] shadow-xs transition cursor-pointer"
              >
                <Camera className="h-2.5 w-2.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    e.target.value = '';
                    setSelectedFileForCrop(file);
                    setCropModalOpen(true);
                  }
                }}
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-bold truncate ${
                  isBlack ? 'text-[#F2F0EA]' : 'text-slate-900'
                }`}
              >
                {user.fullName || 'ApplyVise Candidate'}
              </p>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  isBlack ? 'text-[#92949A]' : 'text-slate-500'
                }`}
              >
                {user.email}
              </p>

              {/* Status pill inside dropdown */}
              <div className="mt-1.5 flex items-center gap-1.5">
                {isBlack ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase font-medium bg-[#111318] text-[#C6A66A] border border-[rgba(198,166,106,0.25)]">
                    <RoyalCrownLogo size="xs" />
                    <span>BLACK ELITE</span>
                  </span>
                ) : isFounderAccount ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-violet-50 text-violet-700 border border-violet-200">
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>FOUNDER ACCESS</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    <span>{plan.toUpperCase()} TIER</span>
                  </span>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Action Items */}
          <div className="py-1 space-y-0.5 text-xs">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isDestructive = item.isDestructive;
              const isAdminOnly = item.isAdminOnly;

              return (
                <button
                  key={item.id}
                  ref={el => { itemRefs.current[index] = el; }}
                  role="menuitem"
                  type="button"
                  tabIndex={isOpen ? 0 : -1}
                  onClick={() => {
                    setIsOpen(false);
                    item.action();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between group transition-colors cursor-pointer ${
                    isDestructive
                      ? isBlack
                        ? 'text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 mt-1 border-t border-[rgba(255,255,255,0.06)]'
                        : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700 mt-1 border-t border-slate-100'
                      : isAdminOnly
                      ? isBlack
                        ? 'text-[#C6A66A] hover:bg-[#191D23] font-semibold'
                        : 'text-indigo-600 hover:bg-indigo-50 font-semibold'
                      : isBlack
                      ? 'text-[#C0BDB5] hover:text-[#F2F0EA] hover:bg-[#191D23]'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isDestructive
                          ? 'text-rose-500'
                          : isAdminOnly
                          ? isBlack ? 'text-[#C6A66A]' : 'text-indigo-600'
                          : isBlack ? 'text-[#92949A] group-hover:text-[#C6A66A]' : 'text-slate-400 group-hover:text-blue-600'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                        isBlack
                          ? 'bg-[#111318] text-[#C6A66A] border border-[rgba(198,166,106,0.25)]'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ProfilePhotoCropModal
        isOpen={cropModalOpen}
        imageFile={selectedFileForCrop}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedFileForCrop(null);
        }}
        onSaveCroppedImage={async (croppedDataUrl) => {
          if (user?.id && typeof localStorage !== 'undefined') {
            localStorage.setItem(`applyvise_user_photo_${user.id}`, croppedDataUrl);
          }
          if (onUpdateUserPhoto) {
            await onUpdateUserPhoto(croppedDataUrl);
          }
          setCropModalOpen(false);
          setSelectedFileForCrop(null);
        }}
      />
    </div>
  );
};

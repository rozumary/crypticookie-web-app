import React from 'react';
import logoImage from '../assets/images/crypticookie_logo_1788085091922.jpg';

interface CrypticookieLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withGlow?: boolean;
}

export const CrypticookieLogo: React.FC<CrypticookieLogoProps> = ({
  className = '',
  size = 'md',
  withGlow = true,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg',
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-14 h-14 rounded-3xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 overflow-hidden bg-[#0A0314] border border-pink-500/30 ${
        sizeClasses[size]
      } ${withGlow ? 'shadow-lg shadow-pink-600/30' : ''} ${className}`}
    >
      <img
        src={logoImage}
        alt="Crypticookie"
        className="w-full h-full object-cover select-none scale-105"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

import React from 'react';
import logoImage from '../assets/images/crypticookie_logo.png';

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
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-13 h-13',
    xl: 'w-20 h-20',
  };

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${
        sizeClasses[size]
      } ${withGlow ? 'filter drop-shadow-[0_0_12px_rgba(219,39,119,0.35)]' : ''} ${className}`}
    >
      <img
        src={logoImage}
        alt="Crypticookie Logo"
        className="w-full h-full object-contain select-none"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

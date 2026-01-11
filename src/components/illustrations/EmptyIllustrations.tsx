import React from 'react';

interface IllustrationProps {
  className?: string;
}

export const EmptyBoxIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="40" y="60" width="120" height="100" rx="8" className="fill-muted stroke-muted-foreground/30" strokeWidth="2"/>
    <path d="M40 80L100 110L160 80" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round"/>
    <path d="M100 110V160" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="100" cy="50" rx="40" ry="15" className="fill-primary/10 stroke-primary/30" strokeWidth="2"/>
    <circle cx="80" cy="130" r="8" className="fill-primary/20"/>
    <circle cx="120" cy="145" r="5" className="fill-primary/15"/>
  </svg>
);

export const EmptyUsersIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="70" r="30" className="fill-muted stroke-muted-foreground/30" strokeWidth="2"/>
    <path d="M50 160C50 130 70 110 100 110C130 110 150 130 150 160" className="fill-muted stroke-muted-foreground/30" strokeWidth="2"/>
    <circle cx="60" cy="90" r="20" className="fill-primary/10 stroke-primary/30" strokeWidth="2"/>
    <circle cx="140" cy="90" r="20" className="fill-primary/10 stroke-primary/30" strokeWidth="2"/>
    <path d="M85 75L95 85L115 65" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const EmptyDocumentIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="30" width="100" height="140" rx="8" className="fill-muted stroke-muted-foreground/30" strokeWidth="2"/>
    <path d="M110 30V60H140" className="stroke-muted-foreground/30" strokeWidth="2" strokeLinecap="round"/>
    <path d="M70 80H130" className="stroke-muted-foreground/20" strokeWidth="2" strokeLinecap="round"/>
    <path d="M70 100H130" className="stroke-muted-foreground/20" strokeWidth="2" strokeLinecap="round"/>
    <path d="M70 120H110" className="stroke-muted-foreground/20" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="130" cy="140" r="25" className="fill-primary/10 stroke-primary/30" strokeWidth="2"/>
    <path d="M120 140L127 147L142 132" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const EmptyChartIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="40" y="140" width="20" height="30" rx="4" className="fill-muted-foreground/20"/>
    <rect x="70" y="110" width="20" height="60" rx="4" className="fill-muted-foreground/20"/>
    <rect x="100" y="80" width="20" height="90" rx="4" className="fill-primary/30"/>
    <rect x="130" y="60" width="20" height="110" rx="4" className="fill-primary/50"/>
    <path d="M40 50L80 70L120 45L160 30" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="40" cy="50" r="5" className="fill-primary"/>
    <circle cx="80" cy="70" r="5" className="fill-primary"/>
    <circle cx="120" cy="45" r="5" className="fill-primary"/>
    <circle cx="160" cy="30" r="5" className="fill-primary"/>
  </svg>
);

export const EmptyNotificationIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 30C75 30 55 50 55 75V110L40 130H160L145 110V75C145 50 125 30 100 30Z" className="fill-muted stroke-muted-foreground/30" strokeWidth="2"/>
    <ellipse cx="100" cy="160" rx="20" ry="10" className="fill-muted stroke-muted-foreground/30" strokeWidth="2"/>
    <circle cx="130" cy="50" r="20" className="fill-primary/20 stroke-primary/50" strokeWidth="2"/>
    <path d="M125 50H135M130 45V55" className="stroke-primary" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const EmptySearchIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="90" cy="90" r="50" className="fill-muted stroke-muted-foreground/30" strokeWidth="3"/>
    <circle cx="90" cy="90" r="35" className="fill-background stroke-muted-foreground/20" strokeWidth="2"/>
    <path d="M130 130L160 160" className="stroke-primary" strokeWidth="6" strokeLinecap="round"/>
    <path d="M75 85C75 75 82 68 92 68" className="stroke-primary/50" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const EmptyMessageIllustration: React.FC<IllustrationProps> = ({ className = "w-32 h-32" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 60C30 50 38 42 48 42H152C162 42 170 50 170 60V120C170 130 162 138 152 138H80L50 165V138H48C38 138 30 130 30 120V60Z" className="fill-muted stroke-muted-foreground/30" strokeWidth="2"/>
    <circle cx="70" cy="90" r="8" className="fill-primary/30"/>
    <circle cx="100" cy="90" r="8" className="fill-primary/40"/>
    <circle cx="130" cy="90" r="8" className="fill-primary/50"/>
  </svg>
);

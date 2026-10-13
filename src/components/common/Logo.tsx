import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 📌 مكان وضع اللوجو (Logo Placement Component)                              */
/* -------------------------------------------------------------------------- */
/* - يمكنك وضع ملف اللوجو الخاص بك مباشرة في المجلد: /public/logo.png         */
/* - سيعمل اللوجو تلقائياً ويظهر في كل مكان بالسيستم.                        */
/* - إذا لم يكن الملف موجوداً أو حدث خطأ، يظهر تلقائياً درع أنيق بألوان      */
/*   مركز كولوراد كـ Fallback لحين وضع صورتك.                                */
/* -------------------------------------------------------------------------- */

export interface LogoProps {
  /** حجم اللوجو */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** إظهار اسم المركز بجانب اللوجو أم لا */
  showText?: boolean;
  /** سمة النص: فاتح للشريط الجانبي وصفحة الدخول، أو داكن للخلفيات الفاتحة */
  textVariant?: 'light' | 'dark';
  /** مسار مخصص للصورة إن أردت تجاوزه */
  src?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  textVariant = 'light',
  src = '/logo.png', // 👈 المسار الافتراضي للوجو في public/logo.png
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // أبعاد اللوجو حسب الحجم
  const dimensions = {
    sm: { img: 'w-9 h-9', icon: 'w-4 h-4', text: 'text-sm', sub: 'text-[10px]' },
    md: { img: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-base', sub: 'text-xs' },
    lg: { img: 'w-16 h-16', icon: 'w-8 h-8', text: 'text-xl', sub: 'text-xs' },
    xl: { img: 'w-24 h-24', icon: 'w-12 h-12', text: 'text-2xl', sub: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* 📌 صندوق اللوجو (Logo Container) */}
      <div
        className={`${dimensions.img} relative shrink-0 flex items-center justify-center rounded-2xl overflow-hidden bg-transparent transition-transform hover:scale-105 duration-200`}
        title="Colorad Language Center Logo"
      >
        {!imageError ? (
          <img
            src={src}
            alt="Colorad Language Center"
            className="w-full h-full object-contain filter drop-shadow-sm"
            onError={() => setImageError(true)}
          />
        ) : (
          /* في حالة عدم وجود الصورة بعد، يظهر هذا الدرع الأنيق بنفس شكل وألوان اللوجو */
          <div className="w-full h-full bg-[#1b2f5d] border border-[#2b4c92]/50 rounded-2xl flex items-center justify-center text-white shadow-md shadow-[#101930]/40">
            <BookOpen className={`${dimensions.icon} text-white`} />
          </div>
        )}
      </div>

      {/* اسم المركز والوصف */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <span
            className={`font-black tracking-tight leading-snug truncate ${dimensions.text} ${
              textVariant === 'light' ? 'text-white' : 'text-[#1a2f61]'
            }`}
          >
            Colorad
          </span>
          <span
            className={`font-semibold tracking-wider uppercase truncate ${dimensions.sub} ${
              textVariant === 'light' ? 'text-[#9ab7e2]' : 'text-[#3c6ec0]'
            }`}
          >
            Language Center
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;

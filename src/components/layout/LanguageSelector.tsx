import React from 'react';
import { useI18n, Language } from '@/contexts/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇲🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useI18n();
  const current = languages.find(l => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{current.flag} {current.label}</span>
          <span className="sm:hidden text-xs">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;

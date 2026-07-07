/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ALLERGENS } from '../data/mockData';

interface AllergenBadgeProps {
  code: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AllergenBadge: React.FC<AllergenBadgeProps> = ({ code, showName = true, size = 'sm' }) => {
  const allergen = ALLERGENS.find((a) => a.code === code);
  if (!allergen) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 rounded-full border',
    md: 'text-sm px-3 py-1 rounded-full border',
    lg: 'text-base px-4 py-2 rounded-full border font-medium',
  };

  const emojiClasses = {
    sm: 'mr-1',
    md: 'mr-1.5 text-base',
    lg: 'mr-2 text-lg',
  };

  return (
    <span
      id={`allergen-badge-${code}`}
      className={`inline-flex items-center font-sans tracking-wide transition-all hover:scale-105 duration-200 ${allergen.color} ${sizeClasses[size]}`}
      title={`${allergen.name} Allergen`}
    >
      <span className={emojiClasses[size]}>{allergen.icon}</span>
      {showName && <span>{allergen.name}</span>}
    </span>
  );
};

interface AllergenGridProps {
  codes: string[];
  showNames?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AllergenGrid: React.FC<AllergenGridProps> = ({ codes, showNames = false, size = 'sm' }) => {
  if (!codes || codes.length === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500 font-sans italic">Allergen Free</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" id="allergen-grid-container">
      {codes.map((code) => (
        <AllergenBadge key={code} code={code} showName={showNames} size={size} />
      ))}
    </div>
  );
};

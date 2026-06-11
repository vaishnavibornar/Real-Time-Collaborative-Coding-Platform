import React from 'react';
import { SUPPORTED_LANGUAGES } from '../../constants';

/**
 * LanguageSelector component
 * Renders a dropdown select element allowing the user to select their desired coding language.
 *
 * @param {string} currentLanguage - The currently active language value (e.g. 'javascript')
 * @param {function} onLanguageChange - Callback function triggered when a new language is selected
 */
export default function LanguageSelector({ currentLanguage, onLanguageChange }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-gray-400">
        Language:
      </label>
      <div className="relative">
        <select
          id="language-select"
          value={currentLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="appearance-none bg-gray-900 border border-gray-700 hover:border-gray-600 text-white text-sm rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value} className="bg-gray-900 text-white">
              {lang.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

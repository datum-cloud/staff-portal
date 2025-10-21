import { messages } from '@/modules/i18n/locales/en';
import { i18n } from '@lingui/core';
import '@testing-library/jest-dom';

// Initialize Lingui with real translations for all tests
await i18n.loadAndActivate({ locale: 'en', messages });

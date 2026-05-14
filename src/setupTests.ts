import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Limpa a "tela" do navegador fantasma após cada teste
afterEach(() => {
  cleanup();
});
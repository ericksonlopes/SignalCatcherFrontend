import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getTranslation } from '../../../locales';
import { DiarizationError } from './DiarizationError';

test('shows the complete processing error as escaped text', () => {
  const { t } = getTranslation('en');
  const html = renderToStaticMarkup(React.createElement(DiarizationError, {
    message: 'RuntimeError: HTTP 403\n<script>alert("error")</script>', t,
  }));
  assert.ok(html.includes('Processing error details'));
  assert.ok(html.includes('RuntimeError: HTTP 403\n&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.match(html, /<details open=""/);
});

test('explains missing error details in both languages', () => {
  for (const language of ['en', 'pt'] as const) {
    const { t } = getTranslation(language);
    for (const message of [undefined, null, '', '   ']) {
      const html = renderToStaticMarkup(React.createElement(DiarizationError, { message, t }));
      assert.ok(html.includes(t('diarizationErrorUnavailable')));
    }
  }
});

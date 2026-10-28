// Настройки окружения. Секретов здесь быть не должно: файл уходит в браузер.
window.NAH_CONFIG = {
  // Источник контента: копия CONTENT_DATA.json (синхронизировать скриптом scripts/sync-content.sh)
  contentUrl: 'data/content.json',
  // Публичный read-only endpoint афиши (отдаёт массив событий по CONTENT_SCHEMA.json).
  // null — события берутся из content.json → events (сейчас пусто).
  eventsApiUrl: null,
  // Demo: ?afisha=loading | ?afisha=error | ?afisha=demo — показать состояния афиши на встрече.
  // На production выключить: allowStatePreview: false.
  allowStatePreview: true,
  // ПРИМЕР события только для показа макета (?afisha=demo). На сайт сам по себе не попадает
  // и помечается «ПРИМЕР». Реальные события приходят из бота / eventsApiUrl.
  sampleEvents: [{
    id: 'sample-vinyl',
    status: 'published',
    title: 'Виниловый вечер.',
    date: '2026-10-18',
    time: '20:00',
    description: 'DJ Lavrov\nВход свободный',
    imageUrl: null,
    linkUrl: 'https://vk.ru/nahlebnikishop', // в примере ведём в группу VK
    updatedAt: null
  }]
};

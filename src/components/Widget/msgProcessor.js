export function isSnippet(message) {
  return Object.keys(message).includes('attachment')
    && Object.keys(message.attachment).includes('type')
    && message.attachment.type === 'template'
    && Object.keys(message.attachment).includes('payload')
    && Object.keys(message.attachment.payload).indexOf('template_type') >= 0
    && message.attachment.payload.template_type === 'generic'
    && Object.keys(message.attachment.payload).indexOf('elements') >= 0
    && message.attachment.payload.elements.length > 0
}

export function isVideo(message) {
  return Object.keys(message).includes('attachment')
  && Object.keys(message.attachment).includes('type')
  && message.attachment.type === 'video'
}

export function isImage(message) {
  return Object.keys(message).includes('attachment')
  && Object.keys(message.attachment).includes('type')
  && message.attachment.type === 'image'
}

export function isText(message) {
  return Object.keys(message).length === 1 && Object.keys(message).includes('text');
}

function _isCustomQR(message) {
  return Object.keys(message).includes('attachment')
  && Object.keys(message.attachment).includes('type')
  && message.attachment.type === 'template'
  && Object.keys(message.attachment).includes('payload')
  && Object.keys(message.attachment.payload).includes('elements')
}

function _isQR(message) {
  return Object.keys(message).length === 2
    && Object.keys(message).includes('text')
    && Object.keys(message).includes('quick_replies');
}

export function isQR(message) {
  return _isQR(message) || _isCustomQR(message);
}

export function extractMessageQR(message) {
  if (_isCustomQR(message)) {
    return message.attachment.payload.elements[0];
  } else {
    return message;
  }
}

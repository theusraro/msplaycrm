/**
 * Utilitário profissional para normalização e validação de telefones brasileiros
 */

const VALID_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
  '21', '22', '24', // RJ
  '27', '28', // ES
  '31', '32', '33', '34', '35', '37', '38', // MG
  '41', '42', '43', '44', '45', '46', // PR
  '47', '48', '49', // SC
  '51', '53', '54', '55', // RS
  '61', // DF
  '62', '64', // GO
  '63', // TO
  '65', '66', // MT
  '67', // MS
  '68', // AC
  '69', // RO
  '71', '73', '74', '75', '77', // BA
  '79', // SE
  '81', '87', // PE
  '82', // AL
  '83', // PB
  '84', // RN
  '85', '88', // CE
  '86', '89', // PI
  '91', '93', '94', // PA
  '92', '97', // AM
  '95', // RR
  '96', // AP
  '98', '99'  // MA
]);

export interface NormalizedPhoneResult {
  isValid: boolean;
  cleanDigits: string; // Ex: 32999998888
  e164: string;        // Ex: 5532999998888
  formatted: string;   // Ex: (32) 99999-8888
  ddd: string;         // Ex: 32
  error?: string;
}

export function normalizeBrazilianPhone(rawPhone: string, defaultDDD: string = '32'): NormalizedPhoneResult {
  if (!rawPhone) {
    return { isValid: false, cleanDigits: '', e164: '', formatted: '', ddd: '', error: 'Telefone vazio' };
  }

  // Remove todos os caracteres não-numéricos
  let digits = rawPhone.replace(/\D/g, '');

  // Remove leading zeros
  digits = digits.replace(/^0+/, '');

  // Se começar com DDI 55 (Brasil) e tiver mais de 11 dígitos, remove o 55 inicial
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Se tiver 8 ou 9 dígitos (sem DDD), adiciona o defaultDDD
  if (digits.length === 8 || digits.length === 9) {
    digits = `${defaultDDD}${digits}`;
  }

  // Trata celulares de 8 dígitos adicionando o 9 na frente (se DDD válido e 8 dígitos no número)
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const firstDigit = digits.charAt(2);
    // Se for celular (começando com 6, 7, 8, 9), adiciona o 9º dígito
    if (VALID_DDDS.has(ddd) && ['6', '7', '8', '9'].includes(firstDigit)) {
      digits = `${ddd}9${digits.slice(2)}`;
    }
  }

  const ddd = digits.slice(0, 2);

  // Validação do tamanho e DDD
  if (!VALID_DDDS.has(ddd)) {
    return {
      isValid: false,
      cleanDigits: digits,
      e164: `55${digits}`,
      formatted: rawPhone,
      ddd,
      error: `DDD "${ddd}" inválido ou ausente`
    };
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return {
      isValid: false,
      cleanDigits: digits,
      e164: `55${digits}`,
      formatted: rawPhone,
      ddd,
      error: `Quantidade de dígitos inválida (${digits.length})`
    };
  }

  // Formatação visual amigável (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX
  let formatted = '';
  if (digits.length === 11) {
    formatted = `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else {
    formatted = `(${ddd}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return {
    isValid: true,
    cleanDigits: digits,
    e164: `55${digits}`,
    formatted,
    ddd
  };
}

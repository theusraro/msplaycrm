/**
 * Parser para vCard (.vcf) e arquivos de texto de contatos (.txt)
 */

export interface ParsedContactItem {
  nome: string;
  telefone: string;
  observacoes: string;
}

export function parseVCard(vcfText: string): ParsedContactItem[] {
  const contacts: ParsedContactItem[] = [];
  const cards = vcfText.split(/BEGIN:VCARD/i);

  for (const card of cards) {
    if (!card.trim()) continue;

    let nome = '';
    let telefone = '';
    let notes = '';

    const lines = card.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();

      // Nome completo (FN:) ou Nome formatado (N:)
      if (trimmed.toUpperCase().startsWith('FN:')) {
        nome = trimmed.substring(3).trim();
      } else if (!nome && trimmed.toUpperCase().startsWith('N:')) {
        const parts = trimmed.substring(2).split(';');
        nome = parts.filter(Boolean).reverse().join(' ').trim();
      }

      // Telefone (TEL;...: ou TEL:)
      if (trimmed.toUpperCase().startsWith('TEL')) {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx !== -1) {
          const telValue = trimmed.substring(colonIdx + 1).trim();
          if (!telefone) {
            telefone = telValue;
          }
        }
      }

      // Notas (NOTE:)
      if (trimmed.toUpperCase().startsWith('NOTE:')) {
        notes = trimmed.substring(5).trim();
      }
    }

    if (nome || telefone) {
      contacts.push({
        nome: nome || 'Contato sem nome',
        telefone: telefone || '',
        observacoes: notes ? `Importado via vCard. ${notes}` : 'Importado via vCard'
      });
    }
  }

  return contacts;
}

export function parsePlainTextContacts(txtContent: string): ParsedContactItem[] {
  const contacts: ParsedContactItem[] = [];
  const lines = txtContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Se tiver formato "Nome, Telefone" ou "Nome - Telefone" ou "Nome; Telefone"
    const separators = [',', ';', '\t', ' - '];
    let found = false;

    for (const sep of separators) {
      if (trimmed.includes(sep)) {
        const [p1, p2, ...rest] = trimmed.split(sep);
        if (p1 && p2) {
          const d1 = p1.replace(/\D/g, '');
          const d2 = p2.replace(/\D/g, '');

          if (d1.length >= 8 && d2.length < 8) {
            contacts.push({ nome: p2.trim(), telefone: p1.trim(), observacoes: rest.join(' ').trim() });
            found = true;
            break;
          } else if (d2.length >= 8) {
            contacts.push({ nome: p1.trim(), telefone: p2.trim(), observacoes: rest.join(' ').trim() });
            found = true;
            break;
          }
        }
      }
    }

    // Se a linha inteira for um telefone
    if (!found) {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length >= 8) {
        contacts.push({
          nome: `Lead ${digits.slice(-4)}`,
          telefone: trimmed,
          observacoes: 'Importado de lista de texto'
        });
      }
    }
  }

  return contacts;
}

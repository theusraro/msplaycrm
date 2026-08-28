# MSPLAY — Configuração Remota, Precedência e Cache

## 🔄 Fluxo de Configuração Remota

O aplicativo cliente consulta:
`GET /v1/device/config?deviceId={MSPLAY_DEVICE_ID}`

### Regra de Precedência:
```
[ DeviceConfig (Específico do Dispositivo) ]
                    ↓
   (Se não houver override para o UUID)
                    ↓
[ AppConfig Global (Padrão para todos) ]
```

* **Exemplo de Funcionamento:**
  * **TV Sala** (UUID `device-sala-01`) possui override com `sourceGroup: "cluster-vip"` e `configVersion: 99`.
  * **TV Quarto** (UUID `device-quarto-02`) não possui override e recebe a configuração global (`sourceGroup: "default"`, `configVersion: 1`).

---

## 🛡️ Política de Cache Local (Offline Continuity)
1. Ao receber resposta válida da API, o app compara `configVersion`. Se for superior à versão local, salva no cache.
2. Se a requisição falhar (sem internet ou API fora do ar), o aplicativo **mantém a última configuração válida do cache local**.
3. O cache nunca é apagado por falhas transitórias de conexão.

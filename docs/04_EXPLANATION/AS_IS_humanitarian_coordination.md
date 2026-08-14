# AS-IS — coordinación de ayuda posterior al terremoto

**Nivel:** L2. **Pregunta:** ¿por qué una donación o reporte no llega necesariamente a la zona que lo necesita?

| S | I | P | O | C |
|---|---|---|---|---|
| Ciudadanía, Alcaldía, socorristas | Reportes, inventario, llamadas | reportar → publicar → validar → coordinar → entregar | Ayuda y estado territorial | Familias, operadores, donantes |

```mermaid
flowchart TD
    subgraph citizen [Ciudadanía]
      C1[Observa necesidad] --> C2[Publica o llama ✋]
      C3[Busca dónde donar 📵]
    end
    subgraph coordination [Coordinación]
      O1[Recibe reportes dispersos ⏱️] --> O2{¿Puede verificar?}
      O2 -- sí --> O3[Asigna ayuda ✋]
      O2 -- no --> O4[Queda pendiente 😖]
    end
    subgraph center [Centro de ayuda]
      A1[Recibe donación] --> A2[Actualiza inventario manualmente ✋ 📵]
    end
    C2 --> O1
    C3 --> A1
    O3 --> A1
```

Leyenda: ✋ paso manual · 😖 dolor · 📵 sin métrica · ⏱️ espera.

| Gap | Evidencia AS-IS | Impacto | Factibilidad | Dueño | TO-BE propuesto |
|---|---|---:|---:|---|---|
| Reportes fragmentados | Redes y llamadas sin formato común | 5 | 5 | Producto | Formulario territorial único |
| Estado envejecido | No existe caducidad visible | 5 | 4 | Operación | Vigencia y reconfirmación |
| Oferta no coincide con demanda | Inventarios y necesidades separados | 5 | 4 | Logística | Matching por categoría y proximidad |


## Destino da Pasta specs/ (SDD Antigo)

### Situação Atual

A pasta `specs/` contém a especificação original no formato SDD (Spec Driven Development). Com a migração para o OpenSpec, todo o conteúdo foi traduzido para `openspec/changes/import-existing-specs/specs/`. A pasta antiga agora é uma duplicata obsoleta.

### Opções

#### Opção A: Remover imediatamente (recomendada)

- Prós: Elimina duplicidade e confusão; força o uso do OpenSpec como fonte única da verdade
- Contras: Perde o histórico de formatação original e referências externas que podem apontar para `specs/`
- Condição: Só deve ser feita após verificação completa de que todo o conteúdo foi migrado

#### Opção B: Manter como referência histórica

- Prós: Preserva o formato original para consulta; útil para comparar SDD vs OpenSpec
- Contras: Mantém duplicidade; risco de edits acidentais na pasta errada; confusão sobre qual é a fonte da verdade

#### Opção C: Manter por um período de transição, depois remover

- Prós: Período de adaptação para a equipe se acostumar com o OpenSpec
- Contras: Complexidade de gerenciar duas fontes; risco de divergência

### Recomendação

**Opção A (remoção imediata), mas somente após:**

1. Validação completa de que todos os cenários BDD, especificações técnicas, e definições foram traduzidos corretamente
2. Atualização de quaisquer scripts ou documentos que referenciem caminhos em `specs/`
3. Commit da migração completa em um branch separado para preservar o histórico
4. Adição de um README no diretório raiz notificando que `specs/` foi movido para `openspec/specs/`

### Procedimento de Remoção

1. Verificar que `openspec validate` passa em todos os specs
2. Verificar que nenhum script de build/teste referencia `specs/`
3. Executar `git rm -r specs/` e commitar
4. Adicionar entrada no `.gitignore` (se aplicável)
5. Atualizar `AGENTS.md` para referenciar `openspec/specs/`

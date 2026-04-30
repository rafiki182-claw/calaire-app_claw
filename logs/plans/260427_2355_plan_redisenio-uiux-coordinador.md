# Plan: Rediseño UI/UX del coordinador — CALAIRE-EA

**Created**: 2026-04-27 23:55  
**Status**: propuesta inicial  
**Slug**: redisenio-uiux-coordinador  
**Alcance principal**: experiencia del coordinador en dashboard, rondas, participantes, configuración PT y resultados.

## Problema

El dashboard actual funciona, pero se siente repetitivo y poco operativo. La interfaz lista entidades varias veces, repite navegación entre sidebar, tabs y enlaces por fila, y obliga al coordinador a interpretar tablas para saber qué debe hacer. El resultado es una experiencia que parece completa, pero no guía el trabajo real.

El coordinador no necesita solo ver rondas, participantes y resultados. Necesita saber:

- qué requiere atención hoy;
- qué ronda está bloqueada;
- qué participante falta por reclamar enlace, enviar ficha o completar resultados;
- cuándo una ronda está lista para análisis o exportación;
- dónde ejecutar la siguiente acción sin recorrer pantallas duplicadas.

## Objetivo

Convertir el dashboard del coordinador en una cabina de control operativa: menos repetición, más diagnóstico, acciones claras por etapa de ronda y navegación contextual.

## Principios de diseño

1. **El dashboard no es un índice**  
   La primera pantalla debe mostrar pendientes y prioridades, no repetir todas las rutas del sistema.

2. **Una ronda es el centro de trabajo**  
   Participantes, ficha, configuración PT, resultados y exportación deben organizarse alrededor de una ronda.

3. **Cada pantalla debe tener una función dominante**  
   Inicio = pendientes globales. Ronda = control operativo. Participantes = gestión de cupos. Resultados = revisión y exportación.

4. **Los estados deben explicar el siguiente paso**  
   `borrador`, `activa` y `cerrada` son estados técnicos. La UI debe traducirlos a estados operativos.

5. **Las acciones destructivas no compiten con la navegación**  
   Borrar, regenerar enlaces o cerrar ronda deben estar visualmente separadas y protegidas.

## Modelo de navegación propuesto

### Navegación global

Mantener una sola navegación principal para coordinador:

- Inicio
- Rondas
- Participantes
- Resultados
- Herramienta PT

Eliminar duplicación entre sidebar y tabs. Si hay sidebar, los tabs globales sobran. Si se prefieren tabs, el sidebar debe desaparecer. Para este aplicativo se recomienda conservar sidebar en escritorio y usar navegación superior compacta en móvil.

### Navegación contextual por ronda

Crear una navegación propia dentro de cada ronda:

- Resumen
- Participantes
- Configuración PT
- Resultados
- Exportación

Ruta sugerida:

- `/dashboard/rondas/[id]` — resumen operativo de ronda
- `/dashboard/rondas/[id]/participantes`
- `/dashboard/rondas/[id]/configuracion-pt`
- `/dashboard/rondas/[id]/resultados`

## Entregable 1: Inicio del coordinador como bandeja de trabajo

### Resultado esperado

Reemplazar el inicio actual del dashboard por una vista de prioridades. El coordinador debe entrar y ver inmediatamente qué requiere acción.

### Componentes

- KPIs globales compactos:
  - rondas activas;
  - fichas pendientes;
  - enlaces sin reclamar;
  - envíos incompletos;
  - rondas listas para exportar.

- Sección “Requiere atención”:
  - participantes con ficha no enviada en rondas activas;
  - cupos pendientes de reclamar;
  - resultados incompletos;
  - rondas activas sin configuración PT completa.

- Sección “Rondas en curso”:
  - una fila por ronda;
  - estado operativo;
  - progreso de participantes;
  - progreso de fichas;
  - progreso de envíos;
  - CTA principal: `Abrir ronda`.

### Criterios de aceptación

- El dashboard no muestra las mismas rutas en sidebar y tabs.
- La acción principal por ronda es abrir su resumen, no saltar a tres destinos diferentes.
- Los pendientes globales son clicables y llevan a vistas filtradas o a la ronda correspondiente.
- El coordinador puede identificar en menos de 10 segundos cuál ronda necesita atención.

## Entregable 2: Resumen operativo de ronda

### Resultado esperado

Crear o completar `/dashboard/rondas/[id]` como cabina de control de una ronda. Esta pantalla debe reemplazar la necesidad de mirar tres páginas para entender el estado de una ronda.

### Componentes

- Encabezado:
  - nombre de ronda;
  - código;
  - estado técnico;
  - estado operativo;
  - acción recomendada.

- Progreso:
  - cupos reclamados / cupos totales;
  - fichas enviadas / cupos reclamados;
  - participantes con envío final / participantes esperados;
  - configuración PT completa / incompleta.

- Alertas operativas:
  - “Hay enlaces sin reclamar”;
  - “Hay fichas pendientes antes de recibir resultados”;
  - “Falta configuración PT”;
  - “Ya hay envíos finales, puede exportar CSV PT”.

- Accesos contextuales:
  - gestionar participantes;
  - configurar PT;
  - revisar resultados;
  - exportar.

### Criterios de aceptación

- La página responde: “¿qué falta para que esta ronda avance?”.
- No repite tablas completas si solo necesita mostrar resumen.
- Cada alerta tiene una acción concreta.
- Las páginas de participantes, PT y resultados se sienten como detalles de la ronda, no como módulos aislados.

## Entregable 3: Tabla de rondas simplificada

### Resultado esperado

Reducir la tabla global de rondas a una lista escaneable. La tabla no debe intentar contener toda la operación.

### Columnas recomendadas

- Estado operativo
- Código / nombre
- Participantes
- Fichas
- Envíos
- Última actividad o fecha de creación
- Acción principal: `Abrir`

### Acciones secundarias

Mover a menú contextual o a la página de resumen:

- editar ronda;
- publicar;
- cerrar;
- reabrir;
- borrar.

### Criterios de aceptación

- No aparecen simultáneamente `Participantes`, `Config. PT`, `Resultados`, `Publicar`, `Editar` y `Borrar` en la misma fila.
- La tabla se lee como estado del programa, no como panel de administración denso.
- Las acciones destructivas quedan separadas del flujo principal.

## Entregable 4: Participantes orientado a pendientes

### Resultado esperado

Transformar participantes de una lista general a una herramienta de seguimiento.

### Vistas

1. **Global**
   - búsqueda por correo;
   - filtro por ronda;
   - filtro por estado: sin reclamar, ficha pendiente, ficha enviada, sin envío final.

2. **Por ronda**
   - cupo;
   - participante;
   - estado de enlace;
   - estado de ficha;
   - estado de envío;
   - acción concreta.

### Acciones esperadas

- copiar enlace de invitación;
- regenerar enlace;
- abrir ficha;
- ver envíos;
- agregar referencia;
- agregar participante extraordinario.

### Criterios de aceptación

- El coordinador puede filtrar “fichas pendientes” sin revisar toda la tabla.
- Los enlaces largos no dominan visualmente la tabla; deben copiarse desde una acción.
- El estado de ficha y estado de envío no se confunden.

## Entregable 5: Resultados como matriz de revisión y exportación

### Resultado esperado

Separar la revisión visual de resultados de la preparación para exportar.

### Componentes

- Resumen superior:
  - participantes esperados;
  - envíos finales;
  - incompletos;
  - exportación disponible / bloqueada.

- Filtros:
  - solo incompletos;
  - solo con envío final;
  - contaminante;
  - nivel/run.

- Exportación:
  - CTA visible solo cuando hay datos exportables;
  - explicación corta cuando está bloqueada.

### Criterios de aceptación

- La matriz PT no es la primera información que el coordinador debe interpretar.
- Los incompletos se pueden aislar.
- Exportar CSV PT se entiende como resultado de un estado listo, no como botón siempre presente.

## Entregable 6: Sistema de estados operativos

### Resultado esperado

Agregar una función de presentación que derive un estado operativo de cada ronda a partir de datos existentes.

### Estados sugeridos

- `Preparar ronda`: ronda en borrador o sin configuración mínima.
- `Invitar participantes`: cupos creados, enlaces pendientes.
- `Esperando fichas`: participantes reclamaron cupo, pero faltan fichas.
- `Recibiendo resultados`: fichas listas y ronda activa.
- `Revisar incompletos`: existen resultados parciales o faltantes.
- `Lista para exportar`: hay envíos finales suficientes.
- `Cerrada`: ronda cerrada.

### Criterios de aceptación

- La UI muestra estado operativo junto al estado técnico.
- Cada estado tiene una acción recomendada.
- El mismo cálculo se reutiliza en dashboard, tabla de rondas y resumen de ronda.

## Entregable 7: Limpieza de lenguaje y microcopy

### Resultado esperado

Unificar términos para evitar que el coordinador interprete conceptos distintos como si fueran lo mismo.

### Glosario UI

- **Cupo**: espacio creado dentro de una ronda.
- **Participante**: usuario/laboratorio que reclamó un cupo.
- **Enlace de invitación**: link individual para reclamar cupo.
- **Ficha**: información administrativa previa al envío de resultados.
- **Resultados PT**: datos técnicos enviados por participante.
- **Envío final**: resultados confirmados para análisis/exportación.

### Criterios de aceptación

- La UI no alterna entre “asignado”, “reclamado”, “participante” y “cupo” sin distinción.
- Los botones dicen la acción real: `Copiar enlace`, `Abrir ficha`, `Revisar resultados`, `Exportar CSV PT`.
- Los estados no usan solo etiquetas técnicas si hay una acción pendiente.

## Fases de implementación

### Fase 1: Reestructurar navegación y dashboard inicial

Archivos probables:

- `app/(protected)/dashboard/layout.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/globals.css`

Tareas:

- eliminar duplicación sidebar/tabs;
- convertir dashboard en bandeja de trabajo;
- simplificar tabla global de rondas;
- reemplazar accesos múltiples por CTA `Abrir ronda`.

### Fase 2: Crear resumen operativo de ronda

Archivos probables:

- `app/(protected)/dashboard/rondas/[id]/page.tsx`
- `lib/rondas.ts`
- posiblemente `convex/rondas.ts` si faltan agregados.

Nota Convex:

Antes de tocar `convex/*`, leer `convex/_generated/ai/guidelines.md`.

Tareas:

- crear métricas por ronda;
- agregar estado operativo;
- mostrar alertas accionables;
- agregar navegación contextual por ronda.

### Fase 3: Rediseñar participantes

Archivos probables:

- `app/(protected)/dashboard/rondas/[id]/participantes/page.tsx`
- `app/(protected)/dashboard/RondaParticipantesSelector.tsx`
- `app/(protected)/dashboard/page.tsx`

Tareas:

- agregar filtros por estado;
- ocultar enlaces largos detrás de acción de copiar/ver;
- diferenciar cupo, participante, ficha y envío;
- priorizar pendientes.

### Fase 4: Rediseñar resultados

Archivos probables:

- `app/(protected)/dashboard/rondas/[id]/resultados/page.tsx`

Tareas:

- agregar filtros operativos;
- mover matriz debajo del resumen;
- mejorar bloqueos de exportación;
- destacar incompletos.

### Fase 5: Pulido visual y consistencia

Archivos probables:

- `app/globals.css`
- componentes nuevos compartidos bajo `app/(protected)/dashboard/`

Tareas:

- crear componentes comunes para badges, progress bars, cards de alerta y acciones;
- reducir repetición de clases;
- asegurar responsividad móvil;
- revisar contraste y foco;
- probar navegación completa.

## Componentes nuevos sugeridos

- `OperationalStatusBadge`
- `RoundProgressStrip`
- `RoundAttentionList`
- `RoundContextNav`
- `CoordinatorMetricCard`
- `CopyInvitationLinkButton`
- `EmptyState`
- `ActionMenu`

## Riesgos

- **Consultas pesadas**: calcular pendientes globales puede aumentar latencia si se hace ronda por ronda.
  - Mitigación: empezar con datos existentes; si se vuelve lento, crear queries agregadas en Convex.

- **Scope creep visual**: intentar rediseñar todo en una sola fase puede dejar la app inestable.
  - Mitigación: implementar por rutas, empezando por dashboard y resumen de ronda.

- **Confusión de estados**: estado técnico y operativo pueden contradecirse si no hay reglas claras.
  - Mitigación: una sola función derivada con tests o casos documentados.

## Criterio final de éxito

El rediseño se considera exitoso si el coordinador puede:

1. entrar al dashboard y saber qué ronda necesita atención;
2. abrir una ronda y entender qué falta para avanzar;
3. filtrar participantes pendientes sin recorrer tablas completas;
4. revisar resultados incompletos rápidamente;
5. exportar cuando la ronda esté lista sin adivinar requisitos;
6. navegar sin encontrar las mismas opciones repetidas en tres lugares.


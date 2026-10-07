# Freight Cost Model

Lenguaje del armado, revisión y adopción de bases de costo para estimar operaciones de transporte.

## Language

**Base de costo**:
Conjunto gobernado de supuestos y parámetros económicos para un segmento y perfil operativo determinados. Sus versiones conservan las decisiones que sustentan cada estimación.
_Avoid_: Tarifa comercial, cotización, base de datos

**Concepto de costo**:
Elemento económico comprensible para el usuario, como mantenimiento, combustible o compensación del operador. Puede requerir varios inputs y supuestos relacionados.
_Avoid_: Campo aislado, sección completa

**Input**:
Valor que entra al cálculo, acompañado de su unidad y ámbito de aplicación. Su procedencia puede ser una referencia de benchmark o una estimación propia del usuario.
_Avoid_: Resultado, fórmula

**Supuesto**:
Condición elegida para representar una operación, como utilización, dotación o política de descansos. Su aceptación explica cuándo un input resulta aplicable.
_Avoid_: Hecho observado, valor universal

**Referencia de benchmark**:
Evidencia de mercado o industria con población, país, periodo, unidad y condiciones identificados. Su utilidad depende de su compatibilidad con el concepto y perfil de la base.
_Avoid_: Default del formulario, precio real del transportista

**Rango observado**:
Mínimo y máximo entre observaciones comparables de una referencia de benchmark. Sus extremos describen esa evidencia y no los límites posibles de todo el mercado.
_Avoid_: Límites de validación, mínimo y máximo de la industria

**Valor central**:
Referencia representativa cuya medida está identificada, por ejemplo promedio o mediana. El punto medio de dos extremos sólo es un supuesto calculado y no acredita un promedio observado.
_Avoid_: Promedio sin muestra, punto medio llamado promedio

**Estándar MARKSMAN**:
Selección documentada para representar una operación típica del segmento y perfil elegidos. Una referencia provisional permanece identificada dentro de esa selección hasta contar con evidencia compatible suficiente.
_Avoid_: Valor universal, todos los defaults del catálogo

**Referencia provisional**:
Proxy o hipótesis documentada que permite continuar una estimación mientras falta evidencia suficiente. La decisión de utilizarla conserva su explicación y sus limitaciones.
_Avoid_: Parámetro calibrado, observación comprobada

**Premisa de la card**:
Condición que explica por qué una selección puede ser adecuada para la operación del usuario. El usuario puede expresar si se identifica con ella y conservar una explicación propia.
_Avoid_: Hecho editable de la fuente, recomendación obligatoria

**Decisión de la card**:
Selección de referencia o captura manual, acompañada de sus premisas, procedencia y justificación cuando corresponda. Forma parte de la versión de la base.
_Avoid_: Aprobación de toda la base

**Calibración de referencia**:
Revisión de valores y condiciones frente a evidencia comparable para el perfil elegido. Validar la aritmética o completar un formulario no acredita por sí solo esa compatibilidad.
_Avoid_: Checklist completado, costo observado del carrier

**Adopción**:
Decisión explícita de incorporar una versión revisada como la versión activa de la base. La calidad de evidencia de cada parámetro conserva su significado después de la adopción.
_Avoid_: Guardar borrador, investigar una fuente

**Actualización de benchmark**:
Nueva revisión de las referencias que puede proponer cambios a una base. El usuario decide qué incorporar y los cambios quedan en una nueva versión revisable.
_Avoid_: Sustitución automática de valores activos

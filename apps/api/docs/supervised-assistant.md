# Asistente supervisado

El endpoint autenticado `POST /assistant/advice` entrega orientación en español para los módulos de Freight Cost Model.

- Es estrictamente de solo lectura: no recibe herramientas, funciones, archivos, URLs, ni acceso a Prisma/Rateware/Gmail.
- No agrega datos de la organización al prompt. La persona escribe una consulta acotada y debe evitar secretos o datos confidenciales de clientes.
- La llamada usa Responses API con `store: false`, máximo 700 tokens de salida y un timeout de 20 segundos.
- La respuesta siempre se presenta como recomendación para revisión humana. No aprueba, publica, envía, entrega ni cambia tarifas.
- `OPENAI_API_KEY` y `OPENAI_MODEL` existen solamente en el entorno del API. El modelo debe configurarse explícitamente; nunca deben agregarse al frontend ni al repositorio.
- Cada llamada crea una bitácora de metadatos: usuario, enfoque, modelo, tamaños, latencia y resultado. No se persisten prompts ni respuestas. La cuota predeterminada es de 12 consultas por usuario por hora.

La validación local cubre el contrato de seguridad de la solicitud. Una prueba real de proveedor requiere un entorno autorizado y se debe reportar aparte de las pruebas locales.

# Registro de indicadores

Abre **index.html** con Edge o Chrome. Funciona sin internet y sin instalar programas. Mantén juntos los archivos de esta carpeta.

## Uso

1. Elige **Venta neta**, **Atenciones**, **TP**, **SA** o **TOTAL APPs**, el año y la semana inicial. La configuración inicial muestra las semanas 27 a 39.
2. En **Pegar ventas**, pega las nueve columnas copiadas desde Excel. Usa fechas completas, por ejemplo 25/09/2026. Se aceptan encabezados, números como 1.234.567 y 1.234,56, tabulaciones o punto y coma. Los campos numéricos vacíos equivalen a cero.
3. Pulsa **Revisar datos**. Si alguna fila es inválida, corrígela antes de guardar. Puedes reemplazar todos los registros de los días pegados o agregar filas omitiendo duplicados exactos.
4. En **Objetivos**, edita la tabla anual con meses en columnas y pulsa **Guardar objetivos**. En **Ajustes por período** puedes elegir la tabla anual o una meta manual para cada barra. En **Escala**, define el mínimo y el máximo y pulsa **Guardar escala**. «Calcular escala» propone un rango que considera los resultados y las metas guardadas. Cada ventana guarda solo sus propios cambios; Cancelar los descarta.
5. Pulsa **Generar Excel**. Se descarga una copia actualizada de tu plantilla, con las hojas de registro y resumen semanal. El archivo original no se sobrescribe. No es necesario convertirlo a XLSM.

El registro se despliega por mes, día y fila. La columna COMPRA reemplaza a Acciones. Para corregir ventas, vuelve a pegarlas usando «Reemplazar todos los registros de ese día». El filtro de mes afecta solamente a la tabla; las tarjetas y las barras siempre muestran el período semanal seleccionado.

**Ocultar primer grupo** y **Ocultar segundo grupo** permiten reducir la tabla de forma independiente. Los botones cambian a **Mostrar** para recuperar esas columnas. La elección se guarda en el navegador y en el respaldo; los datos se conservan y el Excel incluye todas las columnas.

**COMPRA** se muestra con símbolo $ y sin decimales. Las columnas y el indicador de **ATENCIONES** se muestran sin símbolo monetario ni decimales, incluidos los promedios. Los valores originales conservan su precisión para los cálculos.

## TP, SA y APPs

El registro incluye **TP, SA, UBER, PPD YA, RAPPI y TOTAL APPs**, todos expresados en pesos. **TP** es venta neta / atenciones: en el total del mes usa los totales mensuales; en los días y registros muestra el resultado de la semana completa. Sin atenciones, muestra «—».

**SA** toma el neto del grupo 25, SERVICIOS ALIMENTICIOS. Las APPs toman sus netos del desglose guardado; PDD YA, PPD YA y PEDIDOS YA se reconocen como la misma APP. **TOTAL APPs** incluye todas las APPs, también las adicionales. Estos valores no se suman otra vez a la venta neta del registro.

En los días y registros se muestra el valor semanal de SA y APPs. Para el total mensual, cada importe semanal se distribuye por igual entre sus días con registros, sin redondear los cálculos intermedios. Si no hay registros diarios en esa semana, se distribuye entre sus siete días calendario para los indicadores y el resumen mensual de Excel. El reparto se actualiza cuando se incorporan registros.

**▲ verde** identifica el máximo y **▼ rojo** el mínimo de todas las columnas numéricas del registro, incluidas ventas, atenciones, compras y MC. Los importes mensuales se comparan entre meses, los diarios entre días y los registros individuales entre sí dentro del conjunto filtrado. MC semanal, TP y los desgloses semanales se comparan entre semanas. Se excluyen datos ausentes; los ceros sí cuentan. Si todos los valores son iguales o solo hay un período, no se muestran triángulos.

Los indicadores disponibles son Venta neta, Atenciones, TP, SA y TOTAL APPs, cada uno con su título, escala y objetivos. UBER, PPD YA y RAPPI permanecen como columnas y datos del desglose, sin indicadores individuales. En la tabla anual, TP usa **Ticket promedio MES**, SA usa **SERVICIOS ALIMENTICIOS** semanal y TOTAL APPs usa **ECOMMERCE SEM**. Las tres barras del trimestre anterior mantienen el promedio semanal para SA y APPs; TP usa la venta neta mensual dividida por las atenciones mensuales.

Al generar Excel se exporta el indicador seleccionado. **Registro diario** añade las seis métricas semanales en N:S; **Resumen semanal** las incluye en P:U. **Resumen mensual** contiene los totales y el TP mensual; **Distribución desglose** conserva las proporciones usadas para repartir SA y APPs entre meses.

## MC semanal y mensual

La columna **MC** muestra `(venta neta semanal − compra semanal) / venta neta semanal` como porcentaje con dos decimales. Usa el total neto más exentos de todos los registros de la semana ISO, incluso si el filtro mensual solo muestra parte de ella. El porcentaje semanal se repite en cada día y registro de esa semana. La fila de total del mes muestra `(venta neta del mes − compra asignada al mes) / venta neta del mes`, usando los importes exactos antes del formato visual sin decimales. Las compras de semanas que cruzan meses aportan únicamente la parte repartida a los días de ese mes.

Una compra de cero produce 100 % si hay venta. Sin compra registrada, o con venta semanal igual a cero, se muestra «—». Si la compra supera la venta, se conserva el porcentaje negativo. Cambiar al indicador de atenciones no cambia la fórmula de MC: sigue usando ventas.

En Excel, **Registro diario** incluye MC en la columna M y **Compras semanales** incluye la venta neta semanal y MC en H:I. Son fórmulas con formato de porcentaje; la compra usa moneda sin decimales.

## Compras semanales

En **Registro diario → Compras**, elige el año ISO e ingresa el monto de cada semana. La tabla muestra el número de semana, las fechas de inicio y final, y los días con registros. Acepta montos como 1.234.567 y 1.234,56. **Guardar compras** aplica los cambios; Cancelar los descarta. Vacío elimina la compra y 0 conserva una compra de valor cero.

El total semanal se reparte por igual entre las fechas con registros. Los centavos sobrantes se asignan a las primeras fechas en orden cronológico. Si una fecha tiene varias filas, su parte se divide entre ellas conservando el total exacto. Los resúmenes por día y mes suman esas partes; el filtro mensual no modifica el reparto de las semanas que cruzan entre meses. Agregar o reemplazar registros recalcula el reparto.

Una compra de una semana sin registros queda guardada hasta que se incorporen días de esa semana. Las compras se incluyen en el respaldo JSON y en el Excel: **Registro diario** muestra el reparto en la columna L, y **Compras semanales** conserva el monto ingresado, lo distribuido y lo pendiente. Modifica los montos o los días en el HTML y vuelve a generar el Excel para actualizar el reparto.

`modules/compras.js` administra el formulario y su borrador. `core.js` valida los montos y reparte los centavos; la pantalla y el exportador usan ese mismo cálculo. Las compras no cambian las ventas ni las atenciones.

## Ventas por grupos y APPs

En **Registro diario → Ventas por grupos**, selecciona una semana guardada o indica año ISO y número de semana y pulsa **Agregar semana**. Puedes agregar y quitar semanas, categorías y APPs. Número de grupo, nombre, cantidad y venta bruta son editables. **Guardar desglose** guarda los cambios y mantiene la ventana abierta. Cancelar o cerrar descarta únicamente los cambios realizados desde el último guardado.

Las semanas nuevas y los reportes pegados incluyen UBER, PDD YA y RAPPI por defecto, con monto cero si no vienen informadas. PEDIDOS YA se reconoce como PDD YA y conserva su monto. Las semanas siguientes copian la estructura de la seleccionada con valores en cero. Puedes quitar las APPs que no necesites. Cada semana mantiene sus propios datos: editar una categoría o APP no modifica otras semanas.

El importe ingresado es **venta bruta**. La **venta neta** se calcula como bruto ÷ 1,19 para las categorías y APPs. La única excepción es el **grupo 20, CIGARROS**, cuyo neto es igual al bruto. Si falta el número de grupo (0), también se reconoce el nombre CIGARROS. Los netos se conservan sin redondeos intermedios y se muestran como pesos sin decimales. Los subtotales de categorías y APPs se suman para obtener la venta total bruta y neta.

**Pegar reporte del sistema** admite directamente tres columnas **Grupo / Nombre / Monto bruto**, con o sin encabezados. Conserva el número de grupo y completa la cantidad con **0**. Puedes pegar importes como **$289.504**. Las APPs predeterminadas quedan disponibles para completar sus montos. También se conservan los formatos anteriores de cuatro columnas. Los netos se calculan dividiendo por 1,19, salvo CIGARROS (grupo 20). Las cantidades siguen siendo editables y admiten dos decimales, por ejemplo **223,88** en Panadería.

Con fechas completas, el reporte determina la semana. Con número de semana y fechas cortas, se utiliza el año ISO indicado en la ventana y se comprueba que las fechas coincidan. Por ejemplo, semana 1 de 2026 abarca del 29/12/2025 al 04/01/2026. Sin información de semana, se usa la seleccionada. **Revisar reporte** muestra el destino y sus totales; **Usar reporte** reemplaza el desglose de esa semana en el borrador. Pega un reporte semanal por vez.

El desglose es independiente de las filas diarias y no vuelve a sumarse al indicador. La ventana compara la venta neta total del desglose con la venta del registro diario de esa semana. Se conserva en el respaldo JSON. El Excel incorpora **Ventas por grupos**, con categorías y APPs y su neto calculado, y **Resumen ventas por grupos**, con subtotales, venta total y diferencia neta frente al registro diario. Las semanas sin datos diarios muestran esa comparación vacía.

`modules/modelo-grupos.js` contiene el catálogo inicial, la validación, la lectura del reporte y los cálculos. `modules/grupos.js` administra el editor y sus borradores.

## Cálculos y períodos

- Venta neta diaria = monto neto + monto exento del primer grupo + monto exento del segundo grupo.
- Atenciones diarias = total de documentos del primer grupo + total de documentos del segundo grupo.
- Los montos totales y el IVA se conservan como datos de origen y no se suman nuevamente al indicador.
- Las semanas siguen el calendario ISO, de lunes a domingo. Las 13 barras comienzan en la semana indicada, incluso cuando atraviesan un cambio de año. Para 2026, las semanas 27–39 cubren del 29 de junio al 27 de septiembre.
- Las tres primeras barras corresponden a meses calendario del trimestre anterior: del día 1 al último día del mes, incluidos los años bisiestos. Muestran el promedio de los totales semanales con registros dentro de ese mes. Las semanas que cruzan un cambio de mes se recortan: abril solo incluye operaciones del 1 al 30 de abril. Cada tramo semanal con datos cuenta una vez en el promedio; una semana sin datos queda excluida.
- Una semana con un registro de cero sí entra en el promedio. Una semana sin registros se muestra sin datos y se excluye del promedio. Si solo cargas parte de una semana, su resultado es parcial: carga todos sus días antes de la reunión.
- Verde #70AD47 = resultado igual o superior a la meta; rojo #FF0000 = inferior a la meta; negro = hay datos, pero no objetivo; blanco = sin datos. Una meta vacía y una meta cero son diferentes.
- Los valores fuera de la escala se muestran en su borde; el valor exacto sigue visible en la etiqueta y al colocar el cursor sobre la barra. Ajusta la escala para compararlos correctamente.

## Relación con tu plantilla

- H3: título; F9, H9… AK9: objetivos; fila 47: meses y semanas.
- La escala numérica usa B8, B11… B44. B47 conserva «Mes / Sem» porque está combinado con D48 en la plantilla.
- Se interpreta el último rango como AK8:AK45. Las filas 8 y 9 conservan los rótulos y las metas; el cuerpo de las barras ocupa las filas 10 a 45.
- Los resultados se vinculan en la fila 20 y el cumplimiento en la fila 29, siguiendo el diseño original.
- La copia incorpora **Registro diario**, **Resumen semanal** y **Compras semanales**, con datos numéricos y fórmulas trazables. Se conserva el logo, la presentación y la configuración de impresión de la plantilla.
- El HTML es el registro principal. Si agregas filas nuevas o cambias fechas, hazlo aquí y genera una nueva copia. Los rangos de las fórmulas del Excel cubren los registros incluidos al exportar. Las líneas dibujadas de las metas se posicionan al generar la copia.
- «Cambiar plantilla Excel» permite cargar otra copia con la misma distribución. Solo se conserva durante esa sesión. La plantilla original ya está incluida en la aplicación.

## Guardado y respaldo

Los datos se guardan en el almacenamiento local del navegador. Usa siempre el mismo navegador y la misma ubicación de index.html. Si borras los datos del navegador, cambias de perfil, usas modo privado o mueves la aplicación, el registro puede no estar disponible.

**Respaldar datos** descarga un JSON con todos los registros, compras, desgloses de grupos y APPs, metas y configuración. **Restaurar respaldo** lo recupera. Los respaldos anteriores sin compras o desgloses siguen siendo compatibles. Haz respaldos periódicos y antes de cambiar la aplicación de carpeta o equipo. El Excel descargado no se reimporta como registro en esta versión.

La aplicación no se conecta al Excel abierto ni escribe continuamente sobre el archivo original: actualiza los cálculos al guardar los registros y crea el Excel con el botón de exportación.

## Archivos

index.html, styles.css y app.js contienen la interfaz; core.js realiza los cálculos; excel.js rellena la plantilla; plantilla.js incluye la plantilla original; vendor contiene JSZip y su licencia. No se usan servicios externos ni macros.

## Módulos de configuración

- `modules/escala.js`: apertura, validación, propuesta automática y guardado de la escala.
- `modules/objetivos.js`: apertura, validación y guardado de los objetivos por indicador y período.
- `app.js`: conecta ambos módulos al mismo estado y actualiza el guardado, las barras y la exportación. Los módulos no dependen del formulario del otro.
- `styles.css`: tema oscuro con variables de color compartidas. Los colores verde, rojo, negro y blanco conservan el significado del indicador. El estilo del Excel sigue siendo el de la plantilla.

La estructura del respaldo y la clave de almacenamiento se mantienen: los registros, metas y escalas anteriores siguen disponibles al recargar la aplicación en la misma ubicación y navegador.

## Tabla anual basada en objetivos.xlsx

Se incorporó la estructura de «Objetivos 2026», con enero–diciembre como columnas, los valores del archivo y todas sus filas con nombre. El año se puede cambiar dentro de Objetivos. Los demás años comienzan vacíos. La copia incluida es una base inicial: editar el archivo externo no modifica automáticamente el HTML.

Las filas que contienen valores en el archivo siguen siendo editables, incluidos días efectivos, venta mensual, ticket, SA, porcentajes, atenciones, MC, RO y ecommerce. Los porcentajes se escriben en unidades porcentuales: 38,28 significa 38,28 %. Los valores intactos conservan la precisión completa del origen.

Se mantienen las fórmulas del archivo:

- Venta neta diaria = venta mensual ÷ días efectivos.
- Venta neta semanal = venta diaria × 6.
- Turnos 1 y 2 = venta diaria × 60 % y × 40 %.
- Servicios alimenticios semanal = Obj SA ÷ 30 × 7.

Para el indicador de atenciones, la meta semanal es atenciones por día efectivo × 6. Esta regla fue confirmada por el usuario. No se inventan fórmulas para las otras filas, que eran valores o celdas vacías en el archivo.

Las metas de las tres barras del trimestre anterior son las metas semanales de sus respectivos meses. Las 13 semanas usan el mes de su jueves ISO. Se puede cambiar una barra a «Manual» y escribir su meta, incluido 0, o dejarla vacía para «Sin objetivo».

Las metas manuales ya guardadas se conservan y tienen prioridad. **Usar tabla en estos períodos** cambia las 16 barras visibles a cálculo desde la tabla; el cambio se aplica al pulsar **Guardar objetivos**. La tabla anual se guarda en el mismo respaldo JSON junto al registro y la escala. El Excel exportado utiliza las metas resultantes.

`modules/modelo-objetivos.js` contiene las filas, fórmulas, validaciones y la selección de metas. `modules/objetivos.js` administra el editor y los borradores. `objetivos-base.js` contiene los valores originales de 2026. `core.js` y la exportación usan el mismo modelo para evitar diferencias entre pantalla y Excel.

## Niveles de escala redondeados

Escala muestra 13 niveles de menor a mayor. Los extremos se fijan con Mínimo y Máximo; los once niveles intermedios se pueden editar. Deben conservar un orden estrictamente creciente. El cálculo automático recorta las cifras restantes a cero, sin aumentar el valor. El mismo recorte se aplica al terminar de editar un valor y al guardar.

Desde 10.000.000 se conservan cuatro cifras iniciales: 12.345.678 pasa a 12.340.000. Entre 1.000.000 y 9.999.999 se conservan tres: 1.234.567 pasa a 1.230.000. Entre 1.000 y 999.999 se conservan dos: 12.345 pasa a 12.000. Los valores menores que 1.000 se conservan. Si el recorte deja dos niveles iguales, el formulario solicita ampliar el rango o separar los valores. Los niveles personalizados guardados previamente se conservan hasta editar y guardar la escala.

`modules/modelo-escala.js` comparte estos niveles entre HTML y Excel. Las alturas se interpolan entre niveles consecutivos, tanto para las barras como para las metas. El Excel conserva la escala visible de mayor a menor y sus valores reales en AT5:AT17. AU10:AU45 calcula los umbrales de color por fila.

La hoja Resumen semanal mantiene las semanas completas a la izquierda. A la derecha, en I:O, muestra los tramos semanales recortados a los meses calendario para comprobar los tres promedios del trimestre anterior.

Las líneas de objetivo se exportan con coordenadas absolutas, respetando las columnas que atraviesan y la altura de cada fila. Las marcas cortas junto al resultado o porcentaje conservan un ancho positivo y una transformación coherente con sus anclajes. Para aplicar esta corrección a una descarga anterior, recarga el HTML y genera nuevamente el Excel.

Al eliminar los vínculos externos reemplazados por los datos locales, el exportador también quita las asignaciones a esas macros externas en los botones heredados. Esto evita el aviso de reparación de drawing1.xml. El logo y las formas se conservan; el archivo sigue siendo .xlsx y no necesita macros.


## Análisis de ventas por grupo

En Registro diario, pulsa **Análisis de grupos**. Selecciona la semana final y entre **1 y 5 semanas consecutivas**. La vista usa desgloses guardados; las semanas ausentes permanecen visibles como «Sin desglose».

Incluye venta bruta y neta por grupo y APP, crecimiento neto frente a la semana anterior, participación en la última semana y evolución. La primera semana mostrada también usa su semana anterior como referencia, aunque quede fuera de la selección. Si falta el dato comparable se indica «Sin base»; si la base es cero y el valor cambia se indica «Base 0», sin inventar un porcentaje. Un dato ausente se muestra como «—» y no se convierte en cero.

Los gráficos pueden mostrar importes brutos o netos. Elige un grupo o APP en el selector del gráfico, o pulsa su nombre en la tabla o ranking. El ranking muestra los ocho grupos con mayor importe acumulado; la participación utiliza el total de grupos y APPs del período. Puedes buscar, filtrar grupos/APPs y mostrar cantidades. Los totales permanecen referidos al desglose completo.

Los resúmenes de atenciones, TP y MC usan el registro diario y las compras semanales. La participación de cigarros es su venta neta dividida por el total neto del desglose: no representa margen comercial, porque no hay costos específicos de cigarros. La diferencia neta permite comparar el desglose con el registro diario.

El análisis es una vista de consulta en `modules/analisis-grupos.js`; no modifica registros, compras ni indicadores.


## Exportar el comparativo para PowerPoint

En **Análisis de grupos** están los botones **Descargar PNG** y **Exportar comparativo a Excel**. Usan las semanas elegidas y las filas que coinciden con la búsqueda y el filtro de grupos/APPs; los totales siempre corresponden al desglose completo.

- **Comparativo · láminas PNG individuales**: descarga directamente un PNG del resumen gráfico y archivos PNG de la tabla distribuida en láminas de hasta 14 filas. Las imágenes son de **3200 × 1800 píxeles, formato 16:9**. Inserta cada PNG en una diapositiva desde **Insertar → Imágenes → Este dispositivo**.
- **Solo resumen · PNG 16:9**: descarga una imagen con tarjetas, el gráfico del grupo o APP seleccionado, ranking y resumen semanal. Usa la opción bruta/neta elegida para los gráficos.
- **Exportar comparativo a Excel**: genera un archivo `.xlsx` independiente con **Comparativo**, **Resumen** y **Bases crecimiento**. Los importes y porcentajes se exportan como valores numéricos con formato; son una instantánea del análisis, sin fórmulas de recálculo. Incluye las cantidades si activaste su casilla. Las bases conservan el neto de la semana anterior utilizado en cada comparación.

Las descargas se generan localmente mediante `modules/exportar-analisis.js`, sin internet y sin alterar la plantilla del indicador ni los datos guardados.


### Descargar solo el desglose de grupos y APPs

Encima de la tabla **Grupos y APPs** están **Descargar desglose PNG** y **Descargar desglose Excel**. Ambos respetan las semanas, búsqueda, filtro y casilla de cantidades actuales, y conservan los totales generales. Para incluir ambas secciones, usa **Mostrar → Grupos y APPs**.

El PNG contiene únicamente la tabla del desglose: si cabe en una lámina, descarga un `.png`; si requiere varias, descarga las láminas 16:9 como archivos PNG separados. También está disponible en el selector superior como **Solo desglose de grupos y APPs · PNG**. El Excel independiente contiene la hoja **Grupos y APPs**, sin las hojas de resumen ni bases del comparativo completo.

Las imágenes se descargan directamente en PNG, sin ZIP. Debajo de los botones quedan enlaces individuales para volver a descargar cada imagen generada durante la sesión.

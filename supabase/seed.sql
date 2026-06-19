-- Huella MVP - demo seed
truncate table public.sightings restart identity cascade;
truncate table public.notifications restart identity cascade;
truncate table public.pets restart identity cascade;

insert into public.pets (id,nombre,tipo,raza,descripcion,estado,distrito,direccion,latitud,longitud,whatsapp,foto_principal,fecha_reporte,creado_en) values
('00000000-0000-0000-0000-000000000001','Luna','Perro','Labrador dorada','Lleva collar rojo con chapita. Es sociable, pero puede asustarse con el ruido.','perdido','Miraflores','Malecón de la Reserva',-12.1297,-77.0305,'51987654321','https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80',now() - interval '2 days',now() - interval '2 days'),
('00000000-0000-0000-0000-000000000002','Kira','Perro','Beagle','Beagle tricolor, mediana, responde a su nombre.','perdido','Surco','Av. Primavera',-12.1278,-76.9849,'51987654322','https://images.unsplash.com/photo-1544717297-fa95b6ee9643?auto=format&fit=crop&w=900&q=80',now() - interval '1 day',now() - interval '1 day'),
('00000000-0000-0000-0000-000000000003','Max','Perro','Golden Retriever','Golden grande, dócil, collar azul.','perdido','San Borja','Pentagonito',-12.0969,-76.9996,'51987654323','https://images.unsplash.com/photo-1633722715463-d30f4f325e24?auto=format&fit=crop&w=900&q=80',now() - interval '5 days',now() - interval '5 days'),
('00000000-0000-0000-0000-000000000004','Coco','Perro','Mestizo','Pequeño, marrón claro, tímido.','perdido','Barranco','Parque Municipal',-12.1499,-77.0215,'51987654324','https://images.unsplash.com/photo-1588421357574-87938a86fa28?auto=format&fit=crop&w=900&q=80',now() - interval '3 days',now() - interval '3 days'),
('00000000-0000-0000-0000-000000000005','Nala','Gato','Gato naranja','Gata naranja, ojos verdes, no usa collar.','perdido','San Isidro','El Olivar',-12.0975,-77.0366,'51987654325','https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80',now() - interval '2 days',now() - interval '2 days'),
('00000000-0000-0000-0000-000000000006','Toby','Perro','Schnauzer','Encontrado con arnés negro cerca del mercado.','encontrado','Magdalena','Mercado de Magdalena',-12.0916,-77.0679,'51987654326','https://images.unsplash.com/photo-1600804340584-c7db2eacf0bf?auto=format&fit=crop&w=900&q=80',now() - interval '5 hours',now() - interval '5 hours'),
('00000000-0000-0000-0000-000000000007','Pelusa','Gato','Gato blanco','Gato blanco encontrado, muy tranquilo.','encontrado','Pueblo Libre','Av. Bolívar',-12.0763,-77.0611,'51987654327','https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=900&q=80',now() - interval '4 hours',now() - interval '4 hours'),
('00000000-0000-0000-0000-000000000008','Rocky','Perro','Poodle','Poodle blanco encontrado en Chorrillos.','encontrado','Chorrillos','Morro Solar',-12.1823,-77.0301,'51987654328','https://images.unsplash.com/photo-1594149929911-78975a43d4f5?auto=format&fit=crop&w=900&q=80',now() - interval '3 hours',now() - interval '3 hours'),
('00000000-0000-0000-0000-000000000009','Bruno','Perro','Pastor Alemán','Reunido con su familia gracias a la comunidad.','reunido','La Molina','Av. La Molina',-12.0864,-76.9224,'51987654329','https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=900&q=80',now() - interval '10 days',now() - interval '10 days'),
('00000000-0000-0000-0000-000000000010','Misha','Gato','Gata gris','Ya volvió a casa.','reunido','Jesús María','Campo de Marte',-12.0706,-77.0432,'51987654330','https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',now() - interval '12 days',now() - interval '12 days'),
('00000000-0000-0000-0000-000000000011','Thor','Perro','Husky','Fue reconocido por vecinos de Surquillo.','reunido','Surquillo','Av. Angamos',-12.1121,-77.0116,'51987654331','https://images.unsplash.com/photo-1605568427561-40dd23c2acea?auto=format&fit=crop&w=900&q=80',now() - interval '14 days',now() - interval '14 days'),
('00000000-0000-0000-0000-000000000012','Canela','Perro','Mestiza','Reunida después de un avistamiento en Lince.','reunido','Lince','Parque Ramón Castilla',-12.0846,-77.0348,'51987654332','https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=900&q=80',now() - interval '15 days',now() - interval '15 days');

insert into public.sightings (pet_id,comentario,foto,latitud,longitud,ubicacion,estado,creado_en) values
('00000000-0000-0000-0000-000000000001','Vista cerca de Larcomar, iba hacia el malecón.',null,-12.1314,-77.0308,'Larcomar','confirmado',now() - interval '6 hours'),
('00000000-0000-0000-0000-000000000001','Vista en Parque Kennedy por la tarde.',null,-12.1211,-77.0297,'Parque Kennedy','pendiente',now() - interval '4 hours'),
('00000000-0000-0000-0000-000000000001','Vista en Malecón Cisneros, tenía collar rojo.',null,-12.1198,-77.0391,'Malecón Cisneros','pendiente',now() - interval '2 hours'),
('00000000-0000-0000-0000-000000000003','Vista en Pentagonito cerca al circuito.',null,-12.0973,-76.9985,'Pentagonito','confirmado',now() - interval '1 day'),
('00000000-0000-0000-0000-000000000003','Vista en Av. San Borja Norte, parecía desorientado.',null,-12.1009,-77.0032,'Av. San Borja Norte','pendiente',now() - interval '8 hours'),
('00000000-0000-0000-0000-000000000005','Vista en El Olivar escondida entre arbustos.',null,-12.0988,-77.0361,'El Olivar','pendiente',now() - interval '7 hours');

insert into public.notifications (pet_id,tipo,mensaje,leido,creado_en) values
('00000000-0000-0000-0000-000000000001','nuevo_avistamiento','Nuevo avistamiento recibido para Luna',false,now() - interval '2 hours'),
('00000000-0000-0000-0000-000000000003','avistamiento_confirmado','Avistamiento confirmado para Max',false,now() - interval '1 day');

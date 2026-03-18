-- ============================================================
--  OS MANAGER — Seed de Demonstração
--  Simula uma semana de funcionamento de uma assistência técnica
--  Substitua 'SEU_USER_ID' pelo seu user_id antes de rodar
-- ============================================================

DO $$
DECLARE
  v_user      UUID := 'SEU_USER_ID';

  -- Clientes
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  c6 UUID; c7 UUID; c8 UUID;

  -- Técnicos
  t1 UUID; t2 UUID;

  -- Peças
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID;

  -- Ordens
  o1 UUID; o2 UUID; o3 UUID; o4 UUID; o5 UUID;
  o6 UUID; o7 UUID; o8 UUID; o9 UUID;

  -- Orçamentos
  q1 UUID; q2 UUID;

BEGIN

-- ─── Clientes ────────────────────────────────────────────────
INSERT INTO clients (user_id, name, phone, email, document, address, city, state)
VALUES (v_user, 'Carlos Mendonça', '(14) 99812-3344', 'carlos.m@gmail.com', '312.445.890-12', 'Rua das Flores, 142', 'Tupã', 'SP')
RETURNING id INTO c1;

INSERT INTO clients (user_id, name, phone, email, document, address, city, state)
VALUES (v_user, 'Fernanda Oliveira', '(14) 98765-4321', 'fernanda.o@hotmail.com', '485.221.330-55', 'Av. Brasil, 890', 'Tupã', 'SP')
RETURNING id INTO c2;

INSERT INTO clients (user_id, name, phone, document, address, city, state)
VALUES (v_user, 'Roberto Souza', '(14) 99234-5678', '221.334.780-99', 'Rua São João, 55', 'Tupã', 'SP')
RETURNING id INTO c3;

INSERT INTO clients (user_id, name, phone, email, document, address, city, state)
VALUES (v_user, 'Patrícia Lima', '(14) 98811-2233', 'pati.lima@gmail.com', '556.789.120-33', 'Rua Tiradentes, 310', 'Tupã', 'SP')
RETURNING id INTO c4;

INSERT INTO clients (user_id, name, phone, document, address, city, state)
VALUES (v_user, 'Anderson Ferreira', '(14) 99456-7890', '778.990.240-77', 'Rua 7 de Setembro, 88', 'Tupã', 'SP')
RETURNING id INTO c5;

INSERT INTO clients (user_id, name, phone, email, document, address, city, state)
VALUES (v_user, 'Juliana Costa', '(14) 98899-0011', 'ju.costa@yahoo.com', '334.556.670-44', 'Av. Independência, 1200', 'Tupã', 'SP')
RETURNING id INTO c6;

INSERT INTO clients (user_id, name, phone, document, address, city, state)
VALUES (v_user, 'Marcos Teixeira', '(14) 99321-6655', '667.880.910-22', 'Rua Ipiranga, 77', 'Tupã', 'SP')
RETURNING id INTO c7;

INSERT INTO clients (user_id, name, phone, email, document, address, city, state)
VALUES (v_user, 'Simone Barbosa', '(14) 98744-3322', 'simone.b@gmail.com', '119.223.560-88', 'Rua Marechal, 400', 'Tupã', 'SP')
RETURNING id INTO c8;

-- ─── Funcionários ────────────────────────────────────────────
INSERT INTO technicians (user_id, name, phone, specialty, active)
VALUES (v_user, 'Fabiano Pereira', '(14) 99100-2233', 'iPhone e Samsung', true)
RETURNING id INTO t1;

INSERT INTO technicians (user_id, name, phone, specialty, active)
VALUES (v_user, 'Lucas Rodrigues', '(14) 98877-4455', 'Motorola e Xiaomi', true)
RETURNING id INTO t2;

-- ─── Peças ───────────────────────────────────────────────────
INSERT INTO parts (user_id, code, name, unit_price, notes)
VALUES (v_user, 'TL-IPH13', 'Tela iPhone 13 (OLED Original)', 420.00, 'Original retirada')
RETURNING id INTO p1;

INSERT INTO parts (user_id, code, name, unit_price, notes)
VALUES (v_user, 'BAT-IPH13', 'Bateria iPhone 13 (3227mAh)', 110.00, 'Compatível com iPhone 13')
RETURNING id INTO p2;

INSERT INTO parts (user_id, code, name, unit_price, notes)
VALUES (v_user, 'TL-SS-A54', 'Tela Samsung Galaxy A54 (AMOLED)', 220.00, 'Original retirada')
RETURNING id INTO p3;

INSERT INTO parts (user_id, code, name, unit_price, notes)
VALUES (v_user, 'BAT-SS-A54', 'Bateria Samsung Galaxy A54 (5000mAh)', 70.00, 'Original retirada')
RETURNING id INTO p4;

INSERT INTO parts (user_id, code, name, unit_price, notes)
VALUES (v_user, 'CON-USBC', 'Conector USB-C Universal', 15.00, 'Compatível com vários modelos')
RETURNING id INTO p5;

INSERT INTO parts (user_id, code, name, unit_price, notes)
VALUES (v_user, 'TL-MOT-G54', 'Tela Motorola Moto G54 (LCD)', 160.00, 'Original retirada')
RETURNING id INTO p6;

-- ─── Ordens de Serviço ───────────────────────────────────────

-- OS 1: Segunda — iPhone 13, tela quebrada, finalizada e paga
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description, diagnosis, service_performed,
  device_brand, device_model, device_color, device_imei,
  labor_value, parts_total, service_value,
  status, payment_status, payment_method, amount_paid, payment_date,
  opened_at, closed_at
) VALUES (
  v_user, 'OS-2026-1001', c1, t1,
  'Tela trincada após queda', 'Display com rachaduras, touch funcionando parcialmente',
  'Substituição completa do display OLED original',
  'Apple', 'iPhone 13', 'Preto', '351234567890123',
  120.00, 420.00, 540.00,
  'finalizada', 'pago', 'pix', 540.00, NOW() - INTERVAL '6 days',
  CURRENT_DATE - 7, CURRENT_DATE - 6
) RETURNING id INTO o1;

INSERT INTO order_items (order_id, part_id, quantity, unit_price, total_price)
VALUES (o1, p1, 1, 420.00, 420.00);

INSERT INTO order_notes (order_id, user_id, author, content)
VALUES (o1, v_user, 'Fabiano Pereira', 'Cliente pediu para preservar o case original. Entregue sem arranhões.');

-- OS 2: Segunda — Samsung A54, bateria inchada, finalizada e paga
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description, diagnosis, service_performed,
  device_brand, device_model, device_color,
  labor_value, parts_total, service_value,
  status, payment_status, payment_method, amount_paid, payment_date,
  opened_at, closed_at
) VALUES (
  v_user, 'OS-2026-1002', c2, t2,
  'Celular descarregando rápido e bateria estufada',
  'Bateria com 40% de capacidade, deformação visível',
  'Troca de bateria realizada com sucesso',
  'Samsung', 'Galaxy A54', 'Violeta',
  80.00, 70.00, 150.00,
  'finalizada', 'pago', 'dinheiro', 150.00, NOW() - INTERVAL '6 days',
  CURRENT_DATE - 7, CURRENT_DATE - 6
) RETURNING id INTO o2;

INSERT INTO order_items (order_id, part_id, quantity, unit_price, total_price)
VALUES (o2, p4, 1, 70.00, 70.00);

-- OS 3: Terça — Motorola G54, tela quebrada, finalizada pago parcial
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description, diagnosis, service_performed,
  device_brand, device_model, device_color,
  labor_value, parts_total, service_value,
  status, payment_status, payment_method, amount_paid, payment_date,
  opened_at, closed_at
) VALUES (
  v_user, 'OS-2026-1003', c3, t2,
  'Tela quebrada, não liga mais',
  'Display danificado, placa sem danos',
  'Troca do display LCD',
  'Motorola', 'Moto G54', 'Azul',
  80.00, 160.00, 240.00,
  'finalizada', 'pago_parcial', 'pix', 150.00, NOW() - INTERVAL '5 days',
  CURRENT_DATE - 6, CURRENT_DATE - 5
) RETURNING id INTO o3;

INSERT INTO order_items (order_id, part_id, quantity, unit_price, total_price)
VALUES (o3, p6, 1, 160.00, 160.00);

INSERT INTO order_notes (order_id, user_id, author, content)
VALUES (o3, v_user, 'Lucas Rodrigues', 'Cliente pagou R$150 e ficou de pagar o restante R$90 na sexta.');

-- OS 4: Terça — iPhone 13, bateria fraca, finalizada e paga
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description, diagnosis, service_performed,
  device_brand, device_model, device_color,
  labor_value, parts_total, service_value,
  status, payment_status, payment_method, amount_paid, payment_date,
  opened_at, closed_at
) VALUES (
  v_user, 'OS-2026-1004', c4, t1,
  'Bateria não dura o dia todo, carrega lento',
  'Bateria com 61% de capacidade',
  'Substituição da bateria por original Apple',
  'Apple', 'iPhone 13', 'Rosa',
  80.00, 110.00, 190.00,
  'finalizada', 'pago', 'cartao_credito', 190.00, NOW() - INTERVAL '5 days',
  CURRENT_DATE - 6, CURRENT_DATE - 5
) RETURNING id INTO o4;

INSERT INTO order_items (order_id, part_id, quantity, unit_price, total_price)
VALUES (o4, p2, 1, 110.00, 110.00);

-- OS 5: Quarta — Samsung A54, tela e conector, em andamento
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description, diagnosis,
  device_brand, device_model, device_color, device_password,
  labor_value, parts_total, service_value,
  status, payment_status,
  opened_at
) VALUES (
  v_user, 'OS-2026-1005', c5, t1,
  'Tela com listras e não carrega mais',
  'Display com defeito na matriz, conector de carga oxidado',
  'Samsung', 'Galaxy A54', 'Grafite', '1234',
  150.00, 235.00, 385.00,
  'em_andamento', 'pendente',
  CURRENT_DATE - 5
) RETURNING id INTO o5;

INSERT INTO order_items (order_id, part_id, quantity, unit_price, total_price)
VALUES
  (o5, p3, 1, 220.00, 220.00),
  (o5, p5, 1, 15.00, 15.00);

INSERT INTO order_notes (order_id, user_id, author, content)
VALUES (o5, v_user, 'Fabiano Pereira', 'Aguardando peça do conector chegar. Tela já separada para troca.');

-- OS 6: Quinta — sem técnico definido, aberta
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description,
  device_brand, device_model, device_color,
  labor_value, parts_total, service_value,
  status, payment_status,
  opened_at
) VALUES (
  v_user, 'OS-2026-1006', c6, null,
  'Celular caiu na água, não liga',
  'Samsung', 'Galaxy A14', 'Preto',
  0.00, 0.00, 0.00,
  'aberta', 'pendente',
  CURRENT_DATE - 4
) RETURNING id INTO o6;

INSERT INTO order_notes (order_id, user_id, author, content)
VALUES (o6, v_user, 'Fabiano Pereira', 'Aparelho em processo de secagem. Avaliar danos após 48h.');

-- OS 7: Quinta — conector solto, aguardando peça
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description, diagnosis,
  device_brand, device_model,
  labor_value, parts_total, service_value,
  status, payment_status,
  opened_at
) VALUES (
  v_user, 'OS-2026-1007', c7, t2,
  'Carregamento intermitente, precisa mexer o cabo',
  'Conector USB-C com pinos dobrados',
  'Motorola', 'Moto G84',
  60.00, 30.00, 90.00,
  'aguardando_peca', 'pendente',
  CURRENT_DATE - 4
) RETURNING id INTO o7;

INSERT INTO order_notes (order_id, user_id, author, content)
VALUES (o7, v_user, 'Lucas Rodrigues', 'Pedido de 2 conectores feito ao fornecedor. Previsão de chegada amanhã.');

-- OS 8: Sexta — iPhone 13 tela, aberta hoje
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description,
  device_brand, device_model, device_color, device_imei,
  labor_value, parts_total, service_value,
  status, payment_status,
  opened_at
) VALUES (
  v_user, 'OS-2026-1008', c8, t1,
  'Tela com manchas após queda, touch funcionando',
  'Apple', 'iPhone 13', 'Branco', '357890123456789',
  0.00, 0.00, 0.00,
  'aberta', 'pendente',
  CURRENT_DATE - 1
) RETURNING id INTO o8;

-- OS 9: Hoje — cancelada (cliente desistiu)
INSERT INTO service_orders (
  user_id, order_number, client_id, technician_id,
  problem_description, notes,
  device_brand, device_model,
  labor_value, parts_total, service_value,
  status, payment_status,
  opened_at
) VALUES (
  v_user, 'OS-2026-1009', c3, null,
  'Tela quebrada',
  'Cliente optou por não consertar após ver o orçamento',
  'Xiaomi', 'Redmi Note 12',
  0.00, 0.00, 0.00,
  'cancelada', 'pendente',
  CURRENT_DATE
) RETURNING id INTO o9;

-- ─── Orçamentos ──────────────────────────────────────────────

-- Orçamento pendente
INSERT INTO quotes (
  user_id, client_id, technician_id,
  description, notes,
  labor_value, parts_total,
  status
) VALUES (
  v_user, c7, t2,
  'Troca de tela do Motorola Moto G84 com manchas no display',
  'Cliente quer saber se compensa consertar antes de decidir',
  80.00, 210.00,
  'pendente'
) RETURNING id INTO q1;

INSERT INTO quote_items (quote_id, part_id, name, quantity, unit_price, total_price)
VALUES (q1, p6, 'Tela Motorola Moto G84', 1, 210.00, 210.00);

-- Orçamento recusado
INSERT INTO quotes (
  user_id, client_id, technician_id,
  description, notes,
  labor_value, parts_total,
  status
) VALUES (
  v_user, c3, t2,
  'Troca de tela do Xiaomi Redmi Note 12',
  'Cliente achou o valor alto e preferiu não consertar',
  80.00, 190.00,
  'recusado'
) RETURNING id INTO q2;

INSERT INTO quote_items (quote_id, part_id, name, quantity, unit_price, total_price)
VALUES (q2, null, 'Tela Xiaomi Redmi Note 12', 1, 190.00, 190.00);

END $$;

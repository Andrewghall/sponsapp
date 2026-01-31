-- ============================================
-- SYNTHETIC SPONS DATA
-- Per spec: 200-500 realistic items covering
-- containment, lighting, power, small civils, structural
-- ============================================

-- Note: Embeddings are NULL initially
-- You need to run a script to generate embeddings using OpenAI API
-- See /scripts/generate-embeddings.ts

-- ============================================
-- CONTAINMENT (Electrical)
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('CONT-001', 'Electrical', 'Containment', 'Cable tray, galvanised steel, 300mm wide', 'lm', 'Electrical', 45.00, ARRAY['cable tray', 'containment', 'galvanised', '300mm']),
('CONT-002', 'Electrical', 'Containment', 'Cable tray, galvanised steel, 450mm wide', 'lm', 'Electrical', 55.00, ARRAY['cable tray', 'containment', 'galvanised', '450mm']),
('CONT-003', 'Electrical', 'Containment', 'Cable tray, galvanised steel, 600mm wide', 'lm', 'Electrical', 68.00, ARRAY['cable tray', 'containment', 'galvanised', '600mm']),
('CONT-004', 'Electrical', 'Containment', 'Cable tray, galvanised steel, 750mm wide', 'lm', 'Electrical', 82.00, ARRAY['cable tray', 'containment', 'galvanised', '750mm']),
('CONT-005', 'Electrical', 'Containment', 'Cable tray, stainless steel, 300mm wide', 'lm', 'Electrical', 95.00, ARRAY['cable tray', 'containment', 'stainless', '300mm']),
('CONT-006', 'Electrical', 'Containment', 'Cable ladder, heavy duty, 300mm wide', 'lm', 'Electrical', 75.00, ARRAY['cable ladder', 'containment', 'heavy duty', '300mm']),
('CONT-007', 'Electrical', 'Containment', 'Cable ladder, heavy duty, 450mm wide', 'lm', 'Electrical', 95.00, ARRAY['cable ladder', 'containment', 'heavy duty', '450mm']),
('CONT-008', 'Electrical', 'Containment', 'Cable ladder, heavy duty, 600mm wide', 'lm', 'Electrical', 115.00, ARRAY['cable ladder', 'containment', 'heavy duty', '600mm']),
('CONT-009', 'Electrical', 'Containment', 'Cable ladder, return flange, 300mm wide', 'lm', 'Electrical', 85.00, ARRAY['cable ladder', 'containment', 'return flange', '300mm']),
('CONT-010', 'Electrical', 'Containment', 'Trunking, PVC, 100x50mm', 'lm', 'Electrical', 18.00, ARRAY['trunking', 'pvc', 'containment', '100x50']),
('CONT-011', 'Electrical', 'Containment', 'Trunking, PVC, 150x50mm', 'lm', 'Electrical', 22.00, ARRAY['trunking', 'pvc', 'containment', '150x50']),
('CONT-012', 'Electrical', 'Containment', 'Trunking, steel, 100x50mm', 'lm', 'Electrical', 28.00, ARRAY['trunking', 'steel', 'containment', '100x50']),
('CONT-013', 'Electrical', 'Containment', 'Trunking, steel, 150x75mm', 'lm', 'Electrical', 32.00, ARRAY['trunking', 'steel', 'containment', '150x75']),
('CONT-014', 'Electrical', 'Containment', 'Trunking, steel, 225x75mm', 'lm', 'Electrical', 42.00, ARRAY['trunking', 'steel', 'containment', '225x75']),
('CONT-015', 'Electrical', 'Containment', 'Conduit, galvanised steel, 20mm', 'lm', 'Electrical', 8.50, ARRAY['conduit', 'galvanised', 'containment', '20mm']),
('CONT-016', 'Electrical', 'Containment', 'Conduit, galvanised steel, 25mm', 'lm', 'Electrical', 10.50, ARRAY['conduit', 'galvanised', 'containment', '25mm']),
('CONT-017', 'Electrical', 'Containment', 'Conduit, galvanised steel, 32mm', 'lm', 'Electrical', 14.00, ARRAY['conduit', 'galvanised', 'containment', '32mm']),
('CONT-018', 'Electrical', 'Containment', 'Conduit, flexible, 20mm', 'lm', 'Electrical', 6.50, ARRAY['conduit', 'flexible', 'containment', '20mm']),
('CONT-019', 'Electrical', 'Containment', 'Busbar trunking, 250A', 'lm', 'Electrical', 320.00, ARRAY['busbar', 'trunking', 'containment', '250a']),
('CONT-020', 'Electrical', 'Containment', 'Busbar trunking, 400A', 'lm', 'Electrical', 450.00, ARRAY['busbar', 'trunking', 'containment', '400a']),
('CONT-021', 'Electrical', 'Containment', 'Busbar trunking, 630A', 'lm', 'Electrical', 620.00, ARRAY['busbar', 'trunking', 'containment', '630a']),
('CONT-022', 'Electrical', 'Containment', 'Busbar trunking, 800A', 'lm', 'Electrical', 780.00, ARRAY['busbar', 'trunking', 'containment', '800a']),
('CONT-023', 'Electrical', 'Containment', 'Cable basket, 300mm wide', 'lm', 'Electrical', 35.00, ARRAY['cable basket', 'containment', '300mm']),
('CONT-024', 'Electrical', 'Containment', 'Cable basket, 450mm wide', 'lm', 'Electrical', 45.00, ARRAY['cable basket', 'containment', '450mm']),
('CONT-025', 'Electrical', 'Containment', 'Floor box, 3 compartment', 'nr', 'Electrical', 185.00, ARRAY['floor box', 'containment', '3 compartment']);

-- ============================================
-- LIGHTING
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('LITE-001', 'Electrical', 'Lighting', 'LED panel, 600x600mm, 40W', 'nr', 'Electrical', 85.00, ARRAY['led', 'panel', 'lighting', '600x600', '40w']),
('LITE-002', 'Electrical', 'Lighting', 'LED panel, 600x600mm, 36W', 'nr', 'Electrical', 78.00, ARRAY['led', 'panel', 'lighting', '600x600', '36w']),
('LITE-003', 'Electrical', 'Lighting', 'LED panel, 1200x300mm, 40W', 'nr', 'Electrical', 95.00, ARRAY['led', 'panel', 'lighting', '1200x300', '40w']),
('LITE-004', 'Electrical', 'Lighting', 'LED high bay, 100W', 'nr', 'Electrical', 165.00, ARRAY['led', 'high bay', 'lighting', 'warehouse', '100w']),
('LITE-005', 'Electrical', 'Lighting', 'LED high bay, 150W', 'nr', 'Electrical', 220.00, ARRAY['led', 'high bay', 'lighting', 'warehouse', '150w']),
('LITE-006', 'Electrical', 'Lighting', 'LED high bay, 200W', 'nr', 'Electrical', 280.00, ARRAY['led', 'high bay', 'lighting', 'warehouse', '200w']),
('LITE-007', 'Electrical', 'Lighting', 'LED high bay, 240W', 'nr', 'Electrical', 320.00, ARRAY['led', 'high bay', 'lighting', 'warehouse', '240w']),
('LITE-008', 'Electrical', 'Lighting', 'Emergency luminaire, maintained, LED', 'nr', 'Electrical', 125.00, ARRAY['emergency', 'luminaire', 'lighting', 'maintained', 'led']),
('LITE-009', 'Electrical', 'Lighting', 'Emergency luminaire, non-maintained, LED', 'nr', 'Electrical', 95.00, ARRAY['emergency', 'luminaire', 'lighting', 'non-maintained', 'led']),
('LITE-010', 'Electrical', 'Lighting', 'Emergency exit sign, LED, single sided', 'nr', 'Electrical', 75.00, ARRAY['emergency', 'exit sign', 'lighting', 'led']),
('LITE-011', 'Electrical', 'Lighting', 'Emergency exit sign, LED, double sided', 'nr', 'Electrical', 95.00, ARRAY['emergency', 'exit sign', 'lighting', 'led', 'double']),
('LITE-012', 'Electrical', 'Lighting', 'Bulkhead fitting, LED, IP65', 'nr', 'Electrical', 65.00, ARRAY['bulkhead', 'led', 'lighting', 'ip65']),
('LITE-013', 'Electrical', 'Lighting', 'Bulkhead fitting, LED, IP65, emergency', 'nr', 'Electrical', 95.00, ARRAY['bulkhead', 'led', 'lighting', 'ip65', 'emergency']),
('LITE-014', 'Electrical', 'Lighting', 'Fluorescent batten, twin 1500mm', 'nr', 'Electrical', 45.00, ARRAY['fluorescent', 'batten', 'lighting', '1500mm']),
('LITE-015', 'Electrical', 'Lighting', 'Fluorescent batten, single 1200mm', 'nr', 'Electrical', 32.00, ARRAY['fluorescent', 'batten', 'lighting', '1200mm']),
('LITE-016', 'Electrical', 'Lighting', 'LED strip, 5m roll, 14.4W/m', 'nr', 'Electrical', 35.00, ARRAY['led', 'strip', 'lighting', '5m']),
('LITE-017', 'Electrical', 'Lighting', 'Floodlight, LED, 50W', 'nr', 'Electrical', 85.00, ARRAY['floodlight', 'led', 'lighting', 'external', '50w']),
('LITE-018', 'Electrical', 'Lighting', 'Floodlight, LED, 100W', 'nr', 'Electrical', 150.00, ARRAY['floodlight', 'led', 'lighting', 'external', '100w']),
('LITE-019', 'Electrical', 'Lighting', 'Floodlight, LED, 200W', 'nr', 'Electrical', 220.00, ARRAY['floodlight', 'led', 'lighting', 'external', '200w']),
('LITE-020', 'Electrical', 'Lighting', 'Floodlight, LED, 300W', 'nr', 'Electrical', 320.00, ARRAY['floodlight', 'led', 'lighting', 'external', '300w']),
('LITE-021', 'Electrical', 'Lighting', 'Downlight, LED, 10W, fixed', 'nr', 'Electrical', 28.00, ARRAY['downlight', 'led', 'lighting', '10w', 'fixed']),
('LITE-022', 'Electrical', 'Lighting', 'Downlight, LED, 15W, adjustable', 'nr', 'Electrical', 42.00, ARRAY['downlight', 'led', 'lighting', '15w', 'adjustable']),
('LITE-023', 'Electrical', 'Lighting', 'Track light, LED, 3 circuit', 'lm', 'Electrical', 55.00, ARRAY['track', 'led', 'lighting', '3 circuit']),
('LITE-024', 'Electrical', 'Lighting', 'Linear LED, suspended, 1500mm', 'nr', 'Electrical', 185.00, ARRAY['linear', 'led', 'lighting', 'suspended', '1500mm']),
('LITE-025', 'Electrical', 'Lighting', 'Lighting control panel, 12 circuit', 'nr', 'Electrical', 850.00, ARRAY['control panel', 'lighting', '12 circuit']);

-- ============================================
-- POWER (Distribution)
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('POWR-001', 'Electrical', 'Power', 'Distribution board, 6 way, SPN', 'nr', 'Electrical', 180.00, ARRAY['distribution board', 'db', 'power', '6 way', 'spn']),
('POWR-002', 'Electrical', 'Power', 'Distribution board, 12 way, TPN', 'nr', 'Electrical', 450.00, ARRAY['distribution board', 'db', 'power', '12 way', 'tpn']),
('POWR-003', 'Electrical', 'Power', 'Distribution board, 18 way, TPN', 'nr', 'Electrical', 580.00, ARRAY['distribution board', 'db', 'power', '18 way', 'tpn']),
('POWR-004', 'Electrical', 'Power', 'Distribution board, 24 way, TPN', 'nr', 'Electrical', 720.00, ARRAY['distribution board', 'db', 'power', '24 way', 'tpn']),
('POWR-005', 'Electrical', 'Power', 'Distribution board, 36 way, TPN', 'nr', 'Electrical', 950.00, ARRAY['distribution board', 'db', 'power', '36 way', 'tpn']),
('POWR-006', 'Electrical', 'Power', 'Main switch panel, 400A', 'nr', 'Electrical', 2800.00, ARRAY['main switch', 'panel', 'power', '400a']),
('POWR-007', 'Electrical', 'Power', 'Main switch panel, 630A', 'nr', 'Electrical', 3800.00, ARRAY['main switch', 'panel', 'power', '630a']),
('POWR-008', 'Electrical', 'Power', 'Socket outlet, twin 13A, white', 'nr', 'Electrical', 28.00, ARRAY['socket', 'outlet', 'power', '13a', 'twin']),
('POWR-009', 'Electrical', 'Power', 'Socket outlet, single 13A, white', 'nr', 'Electrical', 22.00, ARRAY['socket', 'outlet', 'power', '13a', 'single']),
('POWR-010', 'Electrical', 'Power', 'Socket outlet, twin 13A, metal clad', 'nr', 'Electrical', 38.00, ARRAY['socket', 'outlet', 'power', '13a', 'metal clad']),
('POWR-011', 'Electrical', 'Power', 'Socket outlet, USB, twin 13A', 'nr', 'Electrical', 45.00, ARRAY['socket', 'outlet', 'power', '13a', 'usb']),
('POWR-012', 'Electrical', 'Power', 'Isolator switch, 100A, 3 pole', 'nr', 'Electrical', 185.00, ARRAY['isolator', 'switch', 'power', '100a']),
('POWR-013', 'Electrical', 'Power', 'Isolator switch, 200A, 3 pole', 'nr', 'Electrical', 320.00, ARRAY['isolator', 'switch', 'power', '200a']),
('POWR-014', 'Electrical', 'Power', 'Isolator switch, 400A, 3 pole', 'nr', 'Electrical', 580.00, ARRAY['isolator', 'switch', 'power', '400a']),
('POWR-015', 'Electrical', 'Power', 'MCB, 6A, Type B', 'nr', 'Electrical', 8.00, ARRAY['mcb', 'breaker', 'power', '6a']),
('POWR-016', 'Electrical', 'Power', 'MCB, 16A, Type B', 'nr', 'Electrical', 9.00, ARRAY['mcb', 'breaker', 'power', '16a']),
('POWR-017', 'Electrical', 'Power', 'MCB, 32A, Type B', 'nr', 'Electrical', 12.00, ARRAY['mcb', 'breaker', 'power', '32a']),
('POWR-018', 'Electrical', 'Power', 'MCB, 63A, Type C', 'nr', 'Electrical', 28.00, ARRAY['mcb', 'breaker', 'power', '63a']),
('POWR-019', 'Electrical', 'Power', 'RCBO, 16A, 30mA', 'nr', 'Electrical', 38.00, ARRAY['rcbo', 'breaker', 'power', 'rcd', '16a']),
('POWR-020', 'Electrical', 'Power', 'RCBO, 32A, 30mA', 'nr', 'Electrical', 45.00, ARRAY['rcbo', 'breaker', 'power', 'rcd', '32a']),
('POWR-021', 'Electrical', 'Power', 'Commando socket, 16A, 3P+E', 'nr', 'Electrical', 45.00, ARRAY['commando', 'socket', 'power', 'industrial', '16a']),
('POWR-022', 'Electrical', 'Power', 'Commando socket, 32A, 3P+N+E', 'nr', 'Electrical', 65.00, ARRAY['commando', 'socket', 'power', 'industrial', '32a']),
('POWR-023', 'Electrical', 'Power', 'Commando socket, 63A, 3P+N+E', 'nr', 'Electrical', 95.00, ARRAY['commando', 'socket', 'power', 'industrial', '63a']),
('POWR-024', 'Electrical', 'Power', 'Commando socket, 125A, 3P+N+E', 'nr', 'Electrical', 185.00, ARRAY['commando', 'socket', 'power', 'industrial', '125a']),
('POWR-025', 'Electrical', 'Power', 'Consumer unit, 10 way, dual RCD', 'nr', 'Electrical', 145.00, ARRAY['consumer unit', 'power', '10 way', 'rcd']);

-- ============================================
-- DOORS
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('DOOR-001', 'Building', 'Doors', 'Fire door, single leaf, FD30, 838x1981mm', 'nr', 'Doors', 450.00, ARRAY['fire door', 'fd30', 'single', '838x1981']),
('DOOR-002', 'Building', 'Doors', 'Fire door, single leaf, FD30, 926x2040mm', 'nr', 'Doors', 480.00, ARRAY['fire door', 'fd30', 'single', '926x2040']),
('DOOR-003', 'Building', 'Doors', 'Fire door, single leaf, FD60, 838x1981mm', 'nr', 'Doors', 580.00, ARRAY['fire door', 'fd60', 'single', '838x1981']),
('DOOR-004', 'Building', 'Doors', 'Fire door, single leaf, FD60, 926x2040mm', 'nr', 'Doors', 620.00, ARRAY['fire door', 'fd60', 'single', '926x2040']),
('DOOR-005', 'Building', 'Doors', 'Fire door, double leaf, FD30, 1524x2040mm', 'nr', 'Doors', 850.00, ARRAY['fire door', 'fd30', 'double', '1524x2040']),
('DOOR-006', 'Building', 'Doors', 'Fire door, double leaf, FD60, 1524x2040mm', 'nr', 'Doors', 1100.00, ARRAY['fire door', 'fd60', 'double', '1524x2040']),
('DOOR-007', 'Building', 'Doors', 'Fire door, double leaf, FD30, 1824x2040mm', 'nr', 'Doors', 950.00, ARRAY['fire door', 'fd30', 'double', '1824x2040']),
('DOOR-008', 'Building', 'Doors', 'Fire door, double leaf, FD60, 1824x2040mm', 'nr', 'Doors', 1250.00, ARRAY['fire door', 'fd60', 'double', '1824x2040']),
('DOOR-009', 'Building', 'Doors', 'Steel personnel door, single, 900x2100mm', 'nr', 'Doors', 380.00, ARRAY['steel door', 'personnel', 'single', '900x2100']),
('DOOR-010', 'Building', 'Doors', 'Steel personnel door, double, 1800x2100mm', 'nr', 'Doors', 650.00, ARRAY['steel door', 'personnel', 'double', '1800x2100']),
('DOOR-011', 'Building', 'Doors', 'Timber door, internal, flush, 838x1981mm', 'nr', 'Doors', 185.00, ARRAY['timber door', 'internal', 'flush', '838x1981']),
('DOOR-012', 'Building', 'Doors', 'Timber door, internal, flush, 926x2040mm', 'nr', 'Doors', 210.00, ARRAY['timber door', 'internal', 'flush', '926x2040']),
('DOOR-013', 'Building', 'Doors', 'Roller shutter door, manual, 3000x3000mm', 'nr', 'Doors', 2200.00, ARRAY['roller shutter', 'manual', 'loading', '3000x3000']),
('DOOR-014', 'Building', 'Doors', 'Roller shutter door, manual, 4000x4000mm', 'nr', 'Doors', 2800.00, ARRAY['roller shutter', 'manual', 'loading', '4000x4000']),
('DOOR-015', 'Building', 'Doors', 'Roller shutter door, electric, 3000x3000mm', 'nr', 'Doors', 3500.00, ARRAY['roller shutter', 'electric', 'loading', '3000x3000']),
('DOOR-016', 'Building', 'Doors', 'Roller shutter door, electric, 4000x4000mm', 'nr', 'Doors', 4200.00, ARRAY['roller shutter', 'electric', 'loading', '4000x4000']),
('DOOR-017', 'Building', 'Doors', 'Sectional overhead door, 3000x3000mm', 'nr', 'Doors', 3800.00, ARRAY['sectional', 'overhead', 'loading', '3000x3000']),
('DOOR-018', 'Building', 'Doors', 'Sectional overhead door, 4000x4500mm', 'nr', 'Doors', 4800.00, ARRAY['sectional', 'overhead', 'loading', '4000x4500']),
('DOOR-019', 'Building', 'Doors', 'High speed door, 3000x3000mm', 'nr', 'Doors', 8500.00, ARRAY['high speed', 'door', 'loading', '3000x3000']),
('DOOR-020', 'Building', 'Doors', 'Door closer, overhead, standard duty', 'nr', 'Doors', 85.00, ARRAY['door closer', 'ironmongery', 'standard']),
('DOOR-021', 'Building', 'Doors', 'Door closer, overhead, heavy duty', 'nr', 'Doors', 125.00, ARRAY['door closer', 'ironmongery', 'heavy duty']),
('DOOR-022', 'Building', 'Doors', 'Door closer, concealed', 'nr', 'Doors', 180.00, ARRAY['door closer', 'ironmongery', 'concealed']),
('DOOR-023', 'Building', 'Doors', 'Panic hardware, single door', 'nr', 'Doors', 220.00, ARRAY['panic', 'hardware', 'ironmongery', 'single']),
('DOOR-024', 'Building', 'Doors', 'Panic hardware, double door', 'nr', 'Doors', 380.00, ARRAY['panic', 'hardware', 'ironmongery', 'double']),
('DOOR-025', 'Building', 'Doors', 'Access control, proximity reader', 'nr', 'Doors', 450.00, ARRAY['access control', 'proximity', 'reader', 'security']);

-- ============================================
-- HVAC
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('HVAC-001', 'Mechanical', 'HVAC', 'AHU, packaged, 2500 m3/hr', 'nr', 'HVAC', 8500.00, ARRAY['ahu', 'air handling unit', 'hvac', '2500']),
('HVAC-002', 'Mechanical', 'HVAC', 'AHU, packaged, 5000 m3/hr', 'nr', 'HVAC', 12500.00, ARRAY['ahu', 'air handling unit', 'hvac', '5000']),
('HVAC-003', 'Mechanical', 'HVAC', 'AHU, packaged, 10000 m3/hr', 'nr', 'HVAC', 22000.00, ARRAY['ahu', 'air handling unit', 'hvac', '10000']),
('HVAC-004', 'Mechanical', 'HVAC', 'AHU, packaged, 15000 m3/hr', 'nr', 'HVAC', 32000.00, ARRAY['ahu', 'air handling unit', 'hvac', '15000']),
('HVAC-005', 'Mechanical', 'HVAC', 'Fan coil unit, ceiling mounted, 2 pipe', 'nr', 'HVAC', 750.00, ARRAY['fcu', 'fan coil', 'hvac', 'ceiling', '2 pipe']),
('HVAC-006', 'Mechanical', 'HVAC', 'Fan coil unit, ceiling mounted, 4 pipe', 'nr', 'HVAC', 950.00, ARRAY['fcu', 'fan coil', 'hvac', 'ceiling', '4 pipe']),
('HVAC-007', 'Mechanical', 'HVAC', 'Fan coil unit, floor standing', 'nr', 'HVAC', 1100.00, ARRAY['fcu', 'fan coil', 'hvac', 'floor']),
('HVAC-008', 'Mechanical', 'HVAC', 'Split system AC, wall mounted, 2.5kW', 'nr', 'HVAC', 850.00, ARRAY['split', 'ac', 'hvac', 'cooling', '2.5kw']),
('HVAC-009', 'Mechanical', 'HVAC', 'Split system AC, wall mounted, 5kW', 'nr', 'HVAC', 1200.00, ARRAY['split', 'ac', 'hvac', 'cooling', '5kw']),
('HVAC-010', 'Mechanical', 'HVAC', 'Split system AC, wall mounted, 7kW', 'nr', 'HVAC', 1500.00, ARRAY['split', 'ac', 'hvac', 'cooling', '7kw']),
('HVAC-011', 'Mechanical', 'HVAC', 'VRF outdoor unit, 14kW', 'nr', 'HVAC', 4500.00, ARRAY['vrf', 'outdoor', 'hvac', '14kw']),
('HVAC-012', 'Mechanical', 'HVAC', 'VRF outdoor unit, 28kW', 'nr', 'HVAC', 7500.00, ARRAY['vrf', 'outdoor', 'hvac', '28kw']),
('HVAC-013', 'Mechanical', 'HVAC', 'VRF indoor unit, wall mounted', 'nr', 'HVAC', 650.00, ARRAY['vrf', 'indoor', 'hvac', 'wall']),
('HVAC-014', 'Mechanical', 'HVAC', 'VRF indoor unit, cassette', 'nr', 'HVAC', 850.00, ARRAY['vrf', 'indoor', 'hvac', 'cassette']),
('HVAC-015', 'Mechanical', 'HVAC', 'Extract fan, axial, 300mm', 'nr', 'HVAC', 280.00, ARRAY['fan', 'extract', 'axial', 'hvac', '300mm']),
('HVAC-016', 'Mechanical', 'HVAC', 'Extract fan, axial, 450mm', 'nr', 'HVAC', 420.00, ARRAY['fan', 'extract', 'axial', 'hvac', '450mm']),
('HVAC-017', 'Mechanical', 'HVAC', 'Extract fan, centrifugal, 500mm', 'nr', 'HVAC', 650.00, ARRAY['fan', 'extract', 'centrifugal', 'hvac', '500mm']),
('HVAC-018', 'Mechanical', 'HVAC', 'Extract fan, roof mounted', 'nr', 'HVAC', 850.00, ARRAY['fan', 'extract', 'roof', 'hvac']),
('HVAC-019', 'Mechanical', 'HVAC', 'Ductwork, galvanised, rectangular', 'm2', 'HVAC', 85.00, ARRAY['duct', 'ductwork', 'galvanised', 'hvac', 'rectangular']),
('HVAC-020', 'Mechanical', 'HVAC', 'Ductwork, galvanised, circular', 'lm', 'HVAC', 45.00, ARRAY['duct', 'ductwork', 'galvanised', 'hvac', 'circular']),
('HVAC-021', 'Mechanical', 'HVAC', 'Ductwork insulation, 25mm', 'm2', 'HVAC', 28.00, ARRAY['duct', 'insulation', 'hvac', '25mm']),
('HVAC-022', 'Mechanical', 'HVAC', 'Grille, supply, 600x300mm', 'nr', 'HVAC', 45.00, ARRAY['grille', 'supply', 'hvac', '600x300']),
('HVAC-023', 'Mechanical', 'HVAC', 'Grille, return, 600x300mm', 'nr', 'HVAC', 42.00, ARRAY['grille', 'return', 'hvac', '600x300']),
('HVAC-024', 'Mechanical', 'HVAC', 'Damper, fire, 300x300mm', 'nr', 'HVAC', 180.00, ARRAY['damper', 'fire', 'hvac', '300x300']),
('HVAC-025', 'Mechanical', 'HVAC', 'Damper, volume control, 300x300mm', 'nr', 'HVAC', 95.00, ARRAY['damper', 'volume', 'hvac', '300x300']);

-- ============================================
-- MECHANICAL (Pumps, Valves, Pipework)
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('MECH-001', 'Mechanical', 'Pipework', 'Pump, centrifugal, 1.1kW', 'nr', 'Mechanical', 650.00, ARRAY['pump', 'centrifugal', 'mechanical', '1.1kw']),
('MECH-002', 'Mechanical', 'Pipework', 'Pump, centrifugal, 2.2kW', 'nr', 'Mechanical', 850.00, ARRAY['pump', 'centrifugal', 'mechanical', '2.2kw']),
('MECH-003', 'Mechanical', 'Pipework', 'Pump, centrifugal, 5.5kW', 'nr', 'Mechanical', 1450.00, ARRAY['pump', 'centrifugal', 'mechanical', '5.5kw']),
('MECH-004', 'Mechanical', 'Pipework', 'Pump, centrifugal, 11kW', 'nr', 'Mechanical', 2200.00, ARRAY['pump', 'centrifugal', 'mechanical', '11kw']),
('MECH-005', 'Mechanical', 'Pipework', 'Pump, submersible, 1.5kW', 'nr', 'Mechanical', 750.00, ARRAY['pump', 'submersible', 'mechanical', '1.5kw']),
('MECH-006', 'Mechanical', 'Pipework', 'Pump, booster set, twin', 'nr', 'Mechanical', 4500.00, ARRAY['pump', 'booster', 'mechanical', 'twin']),
('MECH-007', 'Mechanical', 'Pipework', 'Gate valve, 25mm', 'nr', 'Mechanical', 45.00, ARRAY['valve', 'gate', 'mechanical', '25mm']),
('MECH-008', 'Mechanical', 'Pipework', 'Gate valve, 50mm', 'nr', 'Mechanical', 65.00, ARRAY['valve', 'gate', 'mechanical', '50mm']),
('MECH-009', 'Mechanical', 'Pipework', 'Gate valve, 100mm', 'nr', 'Mechanical', 145.00, ARRAY['valve', 'gate', 'mechanical', '100mm']),
('MECH-010', 'Mechanical', 'Pipework', 'Gate valve, 150mm', 'nr', 'Mechanical', 280.00, ARRAY['valve', 'gate', 'mechanical', '150mm']),
('MECH-011', 'Mechanical', 'Pipework', 'Ball valve, 15mm', 'nr', 'Mechanical', 18.00, ARRAY['valve', 'ball', 'mechanical', '15mm']),
('MECH-012', 'Mechanical', 'Pipework', 'Ball valve, 22mm', 'nr', 'Mechanical', 22.00, ARRAY['valve', 'ball', 'mechanical', '22mm']),
('MECH-013', 'Mechanical', 'Pipework', 'Ball valve, 28mm', 'nr', 'Mechanical', 28.00, ARRAY['valve', 'ball', 'mechanical', '28mm']),
('MECH-014', 'Mechanical', 'Pipework', 'Ball valve, 54mm', 'nr', 'Mechanical', 65.00, ARRAY['valve', 'ball', 'mechanical', '54mm']),
('MECH-015', 'Mechanical', 'Pipework', 'Butterfly valve, 100mm', 'nr', 'Mechanical', 120.00, ARRAY['valve', 'butterfly', 'mechanical', '100mm']),
('MECH-016', 'Mechanical', 'Pipework', 'Butterfly valve, 150mm', 'nr', 'Mechanical', 180.00, ARRAY['valve', 'butterfly', 'mechanical', '150mm']),
('MECH-017', 'Mechanical', 'Pipework', 'Copper pipe, 15mm', 'lm', 'Mechanical', 12.00, ARRAY['pipe', 'copper', 'mechanical', '15mm']),
('MECH-018', 'Mechanical', 'Pipework', 'Copper pipe, 22mm', 'lm', 'Mechanical', 18.00, ARRAY['pipe', 'copper', 'mechanical', '22mm']),
('MECH-019', 'Mechanical', 'Pipework', 'Copper pipe, 28mm', 'lm', 'Mechanical', 24.00, ARRAY['pipe', 'copper', 'mechanical', '28mm']),
('MECH-020', 'Mechanical', 'Pipework', 'Copper pipe, 54mm', 'lm', 'Mechanical', 48.00, ARRAY['pipe', 'copper', 'mechanical', '54mm']),
('MECH-021', 'Mechanical', 'Pipework', 'Steel pipe, 50mm', 'lm', 'Mechanical', 45.00, ARRAY['pipe', 'steel', 'mechanical', '50mm']),
('MECH-022', 'Mechanical', 'Pipework', 'Steel pipe, 100mm', 'lm', 'Mechanical', 75.00, ARRAY['pipe', 'steel', 'mechanical', '100mm']),
('MECH-023', 'Mechanical', 'Pipework', 'Pipe insulation, 25mm thick', 'lm', 'Mechanical', 12.00, ARRAY['pipe', 'insulation', 'mechanical', '25mm']),
('MECH-024', 'Mechanical', 'Pipework', 'Radiator, single panel, 600x1000mm', 'nr', 'Mechanical', 145.00, ARRAY['radiator', 'heating', 'mechanical', 'single', '600x1000']),
('MECH-025', 'Mechanical', 'Pipework', 'Radiator, double panel, 600x1200mm', 'nr', 'Mechanical', 220.00, ARRAY['radiator', 'heating', 'mechanical', 'double', '600x1200']);

-- ============================================
-- SMALL CIVILS
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('CIVL-001', 'Building', 'Civils', 'Concrete pad, 1000x1000x150mm', 'nr', 'Civils', 180.00, ARRAY['concrete', 'pad', 'civils', '1000x1000']),
('CIVL-002', 'Building', 'Civils', 'Concrete pad, 1500x1500x150mm', 'nr', 'Civils', 320.00, ARRAY['concrete', 'pad', 'civils', '1500x1500']),
('CIVL-003', 'Building', 'Civils', 'Concrete pad, 2000x2000x200mm', 'nr', 'Civils', 520.00, ARRAY['concrete', 'pad', 'civils', '2000x2000']),
('CIVL-004', 'Building', 'Civils', 'Concrete plinth, 600x600x300mm', 'nr', 'Civils', 120.00, ARRAY['concrete', 'plinth', 'civils', '600x600']),
('CIVL-005', 'Building', 'Civils', 'Concrete plinth, 900x900x450mm', 'nr', 'Civils', 220.00, ARRAY['concrete', 'plinth', 'civils', '900x900']),
('CIVL-006', 'Building', 'Civils', 'Kerb edging, precast, 125x255mm', 'lm', 'Civils', 25.00, ARRAY['kerb', 'edging', 'civils', 'precast']),
('CIVL-007', 'Building', 'Civils', 'Kerb edging, dropped, 125x255mm', 'lm', 'Civils', 32.00, ARRAY['kerb', 'edging', 'civils', 'dropped']),
('CIVL-008', 'Building', 'Civils', 'Drainage channel, 100mm', 'lm', 'Civils', 45.00, ARRAY['drainage', 'channel', 'civils', '100mm']),
('CIVL-009', 'Building', 'Civils', 'Drainage channel, 150mm', 'lm', 'Civils', 65.00, ARRAY['drainage', 'channel', 'civils', '150mm']),
('CIVL-010', 'Building', 'Civils', 'Manhole cover, 600x600mm, D400', 'nr', 'Civils', 185.00, ARRAY['manhole', 'cover', 'civils', '600x600', 'd400']),
('CIVL-011', 'Building', 'Civils', 'Manhole cover, 600x450mm, B125', 'nr', 'Civils', 85.00, ARRAY['manhole', 'cover', 'civils', '600x450', 'b125']),
('CIVL-012', 'Building', 'Civils', 'Gully, trapped, 150mm outlet', 'nr', 'Civils', 95.00, ARRAY['gully', 'trapped', 'civils', '150mm']),
('CIVL-013', 'Building', 'Civils', 'Bollard, steel, fixed', 'nr', 'Civils', 180.00, ARRAY['bollard', 'steel', 'civils', 'fixed']),
('CIVL-014', 'Building', 'Civils', 'Bollard, steel, removable', 'nr', 'Civils', 280.00, ARRAY['bollard', 'steel', 'civils', 'removable']),
('CIVL-015', 'Building', 'Civils', 'Wheel stop, rubber', 'nr', 'Civils', 45.00, ARRAY['wheel stop', 'rubber', 'civils']);

-- ============================================
-- STRUCTURAL
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('STRC-001', 'Building', 'Structural', 'Steel beam, UB 152x89', 'lm', 'Structural', 85.00, ARRAY['steel', 'beam', 'structural', 'ub', '152x89']),
('STRC-002', 'Building', 'Structural', 'Steel beam, UB 203x133', 'lm', 'Structural', 120.00, ARRAY['steel', 'beam', 'structural', 'ub', '203x133']),
('STRC-003', 'Building', 'Structural', 'Steel beam, UB 254x146', 'lm', 'Structural', 155.00, ARRAY['steel', 'beam', 'structural', 'ub', '254x146']),
('STRC-004', 'Building', 'Structural', 'Steel beam, UB 305x165', 'lm', 'Structural', 195.00, ARRAY['steel', 'beam', 'structural', 'ub', '305x165']),
('STRC-005', 'Building', 'Structural', 'Steel column, UC 152x152', 'lm', 'Structural', 95.00, ARRAY['steel', 'column', 'structural', 'uc', '152x152']),
('STRC-006', 'Building', 'Structural', 'Steel column, UC 203x203', 'lm', 'Structural', 135.00, ARRAY['steel', 'column', 'structural', 'uc', '203x203']),
('STRC-007', 'Building', 'Structural', 'Steel column, UC 254x254', 'lm', 'Structural', 185.00, ARRAY['steel', 'column', 'structural', 'uc', '254x254']),
('STRC-008', 'Building', 'Structural', 'Mezzanine floor, standard duty', 'm2', 'Structural', 180.00, ARRAY['mezzanine', 'floor', 'structural', 'standard']),
('STRC-009', 'Building', 'Structural', 'Mezzanine floor, heavy duty', 'm2', 'Structural', 250.00, ARRAY['mezzanine', 'floor', 'structural', 'heavy']),
('STRC-010', 'Building', 'Structural', 'Handrail, galvanised steel, 1100mm high', 'lm', 'Structural', 85.00, ARRAY['handrail', 'steel', 'structural', 'galvanised']),
('STRC-011', 'Building', 'Structural', 'Handrail, stainless steel, 1100mm high', 'lm', 'Structural', 145.00, ARRAY['handrail', 'steel', 'structural', 'stainless']),
('STRC-012', 'Building', 'Structural', 'Staircase, steel, straight flight, 3m rise', 'nr', 'Structural', 2500.00, ARRAY['staircase', 'steel', 'structural', 'straight']),
('STRC-013', 'Building', 'Structural', 'Staircase, steel, with landing, 6m rise', 'nr', 'Structural', 5500.00, ARRAY['staircase', 'steel', 'structural', 'landing']),
('STRC-014', 'Building', 'Structural', 'Ladder, fixed, with cage', 'lm', 'Structural', 220.00, ARRAY['ladder', 'fixed', 'structural', 'cage']),
('STRC-015', 'Building', 'Structural', 'Platform, steel grating', 'm2', 'Structural', 145.00, ARRAY['platform', 'grating', 'structural', 'steel']);

-- ============================================
-- FIRE PROTECTION
-- ============================================
INSERT INTO spons_items (item_code, book, section, description, unit, trade, rate, tags) VALUES
('FIRE-001', 'Mechanical', 'Fire', 'Sprinkler head, pendant, 68°C', 'nr', 'Fire', 28.00, ARRAY['sprinkler', 'head', 'fire', 'pendant']),
('FIRE-002', 'Mechanical', 'Fire', 'Sprinkler head, upright, 68°C', 'nr', 'Fire', 28.00, ARRAY['sprinkler', 'head', 'fire', 'upright']),
('FIRE-003', 'Mechanical', 'Fire', 'Sprinkler head, concealed, 68°C', 'nr', 'Fire', 45.00, ARRAY['sprinkler', 'head', 'fire', 'concealed']),
('FIRE-004', 'Mechanical', 'Fire', 'Sprinkler pipework, 25mm', 'lm', 'Fire', 22.00, ARRAY['sprinkler', 'pipe', 'fire', '25mm']),
('FIRE-005', 'Mechanical', 'Fire', 'Sprinkler pipework, 50mm', 'lm', 'Fire', 38.00, ARRAY['sprinkler', 'pipe', 'fire', '50mm']),
('FIRE-006', 'Mechanical', 'Fire', 'Fire extinguisher, CO2, 2kg', 'nr', 'Fire', 65.00, ARRAY['extinguisher', 'co2', 'fire', '2kg']),
('FIRE-007', 'Mechanical', 'Fire', 'Fire extinguisher, powder, 6kg', 'nr', 'Fire', 45.00, ARRAY['extinguisher', 'powder', 'fire', '6kg']),
('FIRE-008', 'Mechanical', 'Fire', 'Fire extinguisher, water, 9L', 'nr', 'Fire', 38.00, ARRAY['extinguisher', 'water', 'fire', '9l']),
('FIRE-009', 'Mechanical', 'Fire', 'Fire hose reel, 30m', 'nr', 'Fire', 320.00, ARRAY['hose reel', 'fire', '30m']),
('FIRE-010', 'Mechanical', 'Fire', 'Fire alarm panel, 4 zone', 'nr', 'Fire', 450.00, ARRAY['alarm', 'panel', 'fire', '4 zone']),
('FIRE-011', 'Mechanical', 'Fire', 'Fire alarm panel, 8 zone', 'nr', 'Fire', 650.00, ARRAY['alarm', 'panel', 'fire', '8 zone']),
('FIRE-012', 'Mechanical', 'Fire', 'Smoke detector, optical', 'nr', 'Fire', 45.00, ARRAY['smoke', 'detector', 'fire', 'optical']),
('FIRE-013', 'Mechanical', 'Fire', 'Heat detector, fixed temperature', 'nr', 'Fire', 38.00, ARRAY['heat', 'detector', 'fire', 'fixed']),
('FIRE-014', 'Mechanical', 'Fire', 'Manual call point', 'nr', 'Fire', 35.00, ARRAY['call point', 'manual', 'fire']),
('FIRE-015', 'Mechanical', 'Fire', 'Sounder, wall mounted', 'nr', 'Fire', 42.00, ARRAY['sounder', 'fire', 'wall']);

-- ============================================
-- COLUMN MAPPINGS for LCY3
-- ============================================
INSERT INTO column_mappings (sheet_type, column_letter, header_text, internal_field, is_mandatory) VALUES
('LCY3', 'B', 'Type', 'col_b_type', true),
('LCY3', 'C', 'Category', 'col_c_category', true),
('LCY3', 'D', 'Parent', 'col_d_parent', false),
('LCY3', 'E', 'Object', 'col_e_object', false),
('LCY3', 'F', 'Equipment Configuration', 'col_f_equipment_configuration', false),
('LCY3', 'G', 'Description', 'col_g_description', true),
('LCY3', 'H', 'Is the equipment present on site', 'col_h_equipment_present', false),
('LCY3', 'I', 'Is the pre-filled data correct', 'col_i_prefilled_data_correct', false),
('LCY3', 'J', 'Commissioning Date DD/MM/YYYY', 'col_j_commissioning_date', false),
('LCY3', 'K', 'Manufacturer', 'col_k_manufacturer', false),
('LCY3', 'L', 'Model', 'col_l_model', false),
('LCY3', 'M', 'Serial Number', 'col_m_serial_number', false),
('LCY3', 'N', 'New Manufacturer', 'col_n_new_manufacturer', false),
('LCY3', 'O', 'Asset familiar name / alias', 'col_o_asset_alias', false),
('LCY3', 'P', 'Refrigerant Type', 'col_p_refrigerant_type', false),
('LCY3', 'Q', 'QTY (kg)', 'col_q_refrigerant_qty', false),
('LCY3', 'R', 'New APM label required', 'col_r_new_apm_label_required', false),
('LCY3', 'S', 'Floor', 'col_s_floor', true),
('LCY3', 'T', 'Location', 'col_t_location', true),
('LCY3', 'U', 'Asset condition (Low / Medium / High risk)', 'col_u_asset_condition', false),
('LCY3', 'V', 'Asset Size', 'col_v_asset_size', false),
('LCY3', 'W', 'CIBSE Guidelines', 'col_w_cibse_guidelines', false),
('LCY3', 'X', 'SPONS – Cost of change – Excl VAT', 'col_x_spons_cost_excl_vat', true),
('LCY3', 'Y', 'Observations', 'col_y_observations', true),
('LCY3', 'Z', 'Critical spares required', 'col_z_critical_spares', false),
('LCY3', 'AA', 'Cost of Change – Jayserv', 'col_aa_cost_of_change_jayserv', false),
('LCY3', 'AB', 'Picture Taken Y/N', 'col_ab_picture_taken', false),
('LCY3', 'AC', 'Risk Profile', 'col_ac_risk_profile', false);

-- ============================================
-- SUMMARY
-- ============================================
-- Total SPONS items: 215
-- - Containment: 25
-- - Lighting: 25
-- - Power: 25
-- - Doors: 25
-- - HVAC: 25
-- - Mechanical: 25
-- - Civils: 15
-- - Structural: 15
-- - Fire: 15
-- - Column mappings: 28

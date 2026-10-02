import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildUniverse, batchCode, batchOrder, lookCamera, moveCamera, project, safeWebsite, viewCenter } from '../src/lib/universe.ts';
const { companies } = JSON.parse(await readFile(new URL('../public/data/companies.json', import.meta.url)));

test('every directory company belongs to exactly one navigable, deterministic node', () => {
  const first = buildUniverse(companies), second = buildUniverse(companies);
  assert.equal(first.nodes.length, companies.length);
  assert.equal(new Set(first.nodes.map(n => n.company.id)).size, companies.length);
  assert.equal(first.batches.reduce((total,b) => total+b.companies.length,0), companies.length);
  assert.deepEqual(first.nodes.map(n => n.position), second.nodes.map(n => n.position));
  for(const node of first.nodes) {
    assert.equal(node.company.batch, node.batch.name);
    assert.ok(Object.values(node.position).every(Number.isFinite));
  }
});
test('batch chronology handles all four seasons and uses YC spring codes', () => {
  assert.equal(batchCode('Spring 2025'), 'X25');
  assert.equal(batchCode('Summer 2009'), 'S09');
  assert.equal(batchCode('Unspecified'), '—');
  const chronological=['Winter 2025','Spring 2025','Summer 2025','Fall 2025','Winter 2026'];
  assert.deepEqual([...chronological].reverse().sort((a,b)=>batchOrder(a)-batchOrder(b)), chronological);
});
test('projection detects behind-camera nodes and moving forward increases apparent size', () => {
  const camera={x:0,y:0,z:1300,yaw:0,pitch:0};
  const p=project({x:0,y:0,z:0},camera,1536,948);
  assert.equal(p.visible,true);assert.equal(p.x,1536*.49);assert.equal(p.y,948*.45);
  assert.ok(project({x:0,y:0,z:0},{...camera,z:600},1536,948).scale>p.scale);
  assert.equal(project({x:0,y:0,z:2000},camera,1536,948).visible,false);
});
test('website links accept public HTTP URLs and reject executable or invalid schemes', () => {
  assert.equal(safeWebsite('https://stripe.com'), 'https://stripe.com/');
  assert.equal(safeWebsite('stripe.com'), 'https://stripe.com/');
  assert.equal(safeWebsite('javascript:alert(1)'), null);
  assert.equal(safeWebsite('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeWebsite(''), null);
});
test('flight stays aligned with the viewing direction after steering', () => {
  const camera={x:20,y:10,z:1300,yaw:.6,pitch:.2};
  const point={x:camera.x-Math.sin(camera.yaw)*Math.cos(camera.pitch)*500,y:camera.y-Math.sin(camera.pitch)*500,z:camera.z-Math.cos(camera.yaw)*Math.cos(camera.pitch)*500};
  const before=project(point,camera,1536,948);
  assert.ok(Math.abs(before.x-1536*.49)<.001);
  assert.ok(Math.abs(before.y-948*.45)<.001);
  moveCamera(camera,1,0,0,100);
  const after=project(point,camera,1536,948);
  assert.ok(after.scale>before.scale);
  assert.ok(Math.abs(after.x-before.x)<.001);
  assert.ok(Math.abs(after.y-before.y)<.001);
  moveCamera(camera,0,1,0,50);
  assert.ok(project(point,camera,1536,948).x<after.x);
});
test('mouse look turns right and down with the mouse, without reversing vertical input', () => {
  const camera={x:0,y:0,z:1300,yaw:0,pitch:0};
  lookCamera(camera,180,100);
  const originalCenter=project({x:0,y:0,z:0},camera,1536,948);
  assert.ok(originalCenter.x<1536*.49, 'looking right moves the original view to the left');
  assert.ok(originalCenter.y<948*.45, 'looking down moves the original view upward');
  moveCamera(camera,1,0,0,100);
  assert.ok(camera.x>0, 'W flies toward the new rightward view');
  assert.ok(camera.y<0, 'W follows the downward view');
  lookCamera(camera,0,100000);
  assert.ok(camera.pitch<Math.PI/2, 'vertical look cannot flip the camera');
  lookCamera(camera,0,-200000);
  assert.ok(camera.pitch>-Math.PI/2);
});
test('W/S and A/D are opposing movement pairs after mouse steering', () => {
  const camera={x:20,y:10,z:1300,yaw:0,pitch:0};
  lookCamera(camera,-560,-130);
  const initial={...camera};
  moveCamera(camera,1,0,0,150);
  moveCamera(camera,-1,0,0,150);
  moveCamera(camera,0,1,0,150);
  moveCamera(camera,0,-1,0,150);
  for(const axis of ['x','y','z'])assert.ok(Math.abs(camera[axis]-initial[axis])<1e-9);
});
test('the flight projection and aiming point stay at the same exact center on desktop and mobile', () => {
  for(const [width,height] of [[1280,724],[390,782]]){
    const camera={x:20,y:10,z:1300,yaw:0,pitch:0};
    lookCamera(camera,180,-100);
    const point={x:camera.x-Math.sin(camera.yaw)*Math.cos(camera.pitch)*500,y:camera.y-Math.sin(camera.pitch)*500,z:camera.z-Math.cos(camera.yaw)*Math.cos(camera.pitch)*500};
    const center=viewCenter(width,height,true);
    assert.deepEqual(center,{x:width/2,y:height/2});
    const before=project(point,camera,width,height,true);
    assert.ok(Math.abs(before.x-center.x)<1e-9);
    assert.ok(Math.abs(before.y-center.y)<1e-9);
    moveCamera(camera,1,0,0,100);
    const after=project(point,camera,width,height,true);
    assert.ok(Math.abs(after.x-center.x)<1e-9);
    assert.ok(Math.abs(after.y-center.y)<1e-9);
    assert.ok(after.scale>before.scale);
  }
});

export type Company = {
  id: number; name: string; slug: string; logo: string; website: string;
  location: string; description: string; batch: string; status: string;
  industry: string; tags: string[]; top: boolean; team: number;
};
export type Dataset = { updated: string; source: string; companies: Company[] };
export type Vec3 = { x: number; y: number; z: number };
export type Batch = { name: string; code: string; color: string; position: Vec3; radius: number; companies: Company[]; featured: boolean };
export type SceneNode = { company: Company; batch: Batch; position: Vec3; featured: boolean };
export type Camera = Vec3 & { yaw: number; pitch: number };
export type SceneApi = {
  reset: () => void; zoom: (amount: number) => void;
  focusBatch: (name: string) => void; focusCompany: (id: number) => void;
  startFlight: () => void;
};

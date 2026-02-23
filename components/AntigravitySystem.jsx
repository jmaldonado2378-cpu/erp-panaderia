'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ZapOff, GripHorizontal } from 'lucide-react';

/**
 * @persona Google Antigravity Architect
 * @description Sistema de Gravedad Aislado (Wrapper).
 * Protege el hilo principal y solo aplica físicas a los elementos con clase '.fall-target'.
 */

export const AntigravitySystem = ({ children }) => {
    const [gravityActive, setGravityActive] = useState(false);
    const requestRef = useRef(null);
    const worldRef = useRef(null);
    const bodiesRef = useRef([]);

    const triggerSystemCrash = async () => {
        if (gravityActive) return;
        setGravityActive(true);
        console.log("Arquitecto: Iniciando secuencia de colapso. Desacoplando DOM...");

        // 1. Inyectar Box2D dinámicamente solo cuando es necesario
        if (!window.Box2D) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/box2dweb/2.1.a.3/Box2D.min.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            console.log("Arquitecto: Motor V8 enlazado con Box2D.");
        }

        // Atajos del motor Box2D
        const { b2Vec2, b2BodyDef, b2Body, b2FixtureDef, b2World } = Box2D.Dynamics;
        const { b2PolygonShape } = Box2D.Collision.Shapes;
        const { b2MouseJointDef } = Box2D.Dynamics.Joints;

        // Parámetros de Seguridad Físicos
        const SCALE = 30.0;
        const TIMESTEP = 1.0 / 60.0;
        const MAX_BODIES = 100; // Guardrail contra colapso de CPU

        // Inicializar Mundo
        const world = new b2World(new b2Vec2(0, 9.81), true);
        worldRef.current = world;

        // Crear Suelo y Paredes (Límites de la pantalla para evitar caída infinita)
        const createBoundary = (x, y, w, h) => {
            const fixDef = new b2FixtureDef();
            fixDef.density = 1.0;
            fixDef.friction = 0.5;
            fixDef.restitution = 0.3; // Rebote de las paredes
            fixDef.shape = new b2PolygonShape();
            fixDef.shape.SetAsBox(w / 2 / SCALE, h / 2 / SCALE);

            const bodyDef = new b2BodyDef();
            bodyDef.type = b2Body.b2_staticBody;
            bodyDef.position.Set(x / SCALE, y / SCALE);
            world.CreateBody(bodyDef).CreateFixture(fixDef);
        };

        const width = window.innerWidth;
        const height = window.innerHeight;
        createBoundary(width / 2, height + 50, width, 100); // Suelo
        createBoundary(-50, height / 2, 100, height); // Pared Izq
        createBoundary(width + 50, height / 2, 100, height); // Pared Der

        // 2. Escaneo Seguro del DOM (Anti-Thrashing)
        // Solo buscamos los contenedores designados por el desarrollador
        const domElements = document.querySelectorAll('.fall-target');

        // Medimos todos juntos ANTES de modificar el CSS
        const measurements = Array.from(domElements).map(el => ({
            el,
            rect: el.getBoundingClientRect()
        }));

        const activeBodies = [];

        // 3. Fase de Mutación (Aislamiento a Fixed y GPU)
        measurements.forEach(({ el, rect }, index) => {
            if (index >= MAX_BODIES) return;

            // Desacoplar del flujo normal de HTML
            el.style.position = 'fixed';
            el.style.left = '0px';
            el.style.top = '0px';
            el.style.width = `${rect.width}px`;
            el.style.height = `${rect.height}px`;
            el.style.margin = '0px';
            el.style.zIndex = '9999'; // Traer al frente
            el.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;

            // Configurar Masa y Fricción en el motor
            const fixDef = new b2FixtureDef();
            fixDef.density = 1.0;
            fixDef.friction = 0.5;
            fixDef.restitution = 0.4; // Buen rebote visual
            fixDef.shape = new b2PolygonShape();
            fixDef.shape.SetAsBox(rect.width / 2 / SCALE, rect.height / 2 / SCALE);

            const bodyDef = new b2BodyDef();
            bodyDef.type = b2Body.b2_dynamicBody;
            bodyDef.position.Set((rect.left + rect.width / 2) / SCALE, (rect.top + rect.height / 2) / SCALE);

            const body = world.CreateBody(bodyDef);
            body.CreateFixture(fixDef);

            // Pequeño impulso inicial aleatorio para desestabilizar
            body.ApplyImpulse(new b2Vec2((Math.random() - 0.5) * 5, 0), body.GetWorldCenter());

            activeBodies.push({ domNode: el, body, width: rect.width, height: rect.height });
        });

        bodiesRef.current = activeBodies;

        // ====================================================================
        // 4. KINÉTICA DE RATÓN (Mouse Joint) - Permite arrastrar cajas
        // ====================================================================
        let mouseJoint = null;
        const groundBody = world.CreateBody(new b2BodyDef()); // Ancla invisible

        const getBodyAtMouse = (x, y) => {
            const mouseVec = new b2Vec2(x / SCALE, y / SCALE);
            const aabb = new Box2D.Collision.b2AABB();
            aabb.lowerBound.Set(mouseVec.x - 0.001, mouseVec.y - 0.001);
            aabb.upperBound.Set(mouseVec.x + 0.001, mouseVec.y + 0.001);

            let selectedBody = null;
            world.QueryAABB((fixture) => {
                if (fixture.GetBody().GetType() !== b2Body.b2_staticBody) {
                    if (fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mouseVec)) {
                        selectedBody = fixture.GetBody();
                        return false;
                    }
                }
                return true;
            }, aabb);
            return selectedBody;
        };

        const handleMouseDown = (e) => {
            if (!worldRef.current) return;
            const body = getBodyAtMouse(e.clientX, e.clientY);
            if (body) {
                const md = new b2MouseJointDef();
                md.bodyA = groundBody;
                md.bodyB = body;
                md.target.Set(e.clientX / SCALE, e.clientY / SCALE);
                md.collideConnected = true;
                md.maxForce = 300.0 * body.GetMass();
                mouseJoint = worldRef.current.CreateJoint(md);
                body.SetAwake(true);
            }
        };

        const handleMouseMove = (e) => {
            if (mouseJoint) {
                mouseJoint.SetTarget(new b2Vec2(e.clientX / SCALE, e.clientY / SCALE));
            }
        };

        const handleMouseUp = () => {
            if (mouseJoint && worldRef.current) {
                worldRef.current.DestroyJoint(mouseJoint);
                mouseJoint = null;
            }
        };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        // 5. Bucle Principal de Renderizado (Tick)
        const updatePhysics = () => {
            if (!worldRef.current) return;
            worldRef.current.Step(TIMESTEP, 10, 10);
            worldRef.current.ClearForces();

            for (let i = 0; i < bodiesRef.current.length; i++) {
                const item = bodiesRef.current[i];
                const pos = item.body.GetPosition();
                const angle = item.body.GetAngle();

                const x = (pos.x * SCALE) - (item.width / 2);
                const y = (pos.y * SCALE) - (item.height / 2);

                item.domNode.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${angle}rad)`;
            }
            requestRef.current = requestAnimationFrame(updatePhysics);
        };

        requestRef.current = requestAnimationFrame(updatePhysics);
    };

    // Limpieza al desmontar (Gestión de Memoria)
    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (worldRef.current) worldRef.current = null;
        };
    }, []);

    return (
        <div className={gravityActive ? 'h-screen overflow-hidden cursor-move select-none' : ''}>
            {children}

            {/* Control Panel (Flotante) para accionar la gravedad */}

            {!gravityActive && (
                <button
                    onClick={triggerSystemCrash}
                    className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 border-4 border-red-800"
                    title="Activar Antigravity"
                >
                    <ZapOff size={28} />
                </button>
            )}
            {gravityActive && (
                <div className="bg-slate-900 text-white text-xs p-3 rounded-lg border border-slate-700 shadow-xl flex items-center gap-2 animate-pulse">
                    <GripHorizontal size={16} className="text-blue-400" />
                    <span>Físicas activas. Arrastra las cajas con el ratón.</span>
                </div>
            )}
        </div>
        </div >
    );
};

export default AntigravitySystem;

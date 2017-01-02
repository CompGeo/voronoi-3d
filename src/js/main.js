
CompGeo = function() {
    var self = this;
    this.params = {
        targetRotation: 0,
        windowHalfX: window.innerWidth / 2,
        windowHalfY: window.innerHeight / 2,
        width: 1000,
        height: 750,
        userpoints: [],
        shapes: {},
        numpoints: 100,
        size: 2
    };

    this.init = function () {
        var params = this.params;
        params.scene = new THREE.Scene();
       // params.scene.rotation.y = ( params.targetRotation - params.scene.rotation.y ) * 0.05;

        self.initLighting(params);

        self.initCamera(params);

        params.raycaster = new THREE.Raycaster();
        params.mouse = new THREE.Vector2();

        this.initRenderer();

        this.generateShapes();

        params.axis = new THREE.AxisHelper(5);
        params.axis.visible = false;

        params.scene.add(params.axis);

        params.paraboloidgroup.visible = false;
        params.shapes.grid.visible = false;
        params.pointgroup.add(params.shapes.grid);
        params.paraboloidgroup.add(params.shapes.paraboloid);

        params.shapes.lifted.visible = false;
        params.paraboloidgroup.add(params.shapes.lifted);

        self.createConvexHull();
        params.shapes.convexhull.visible = false;

        self.projectConvexHullBottom();

        self.toVoronoiBottom_1();
        self.toVoronoiBottom_2();



        document.addEventListener('mousemove', self.onDocumentMouseMove, false);
        // document.addEventListener( 'dblclick', gridclick, false );
        window.addEventListener('resize', self.onWindowResize, false);

        try {
            $('#next').click(self.next);
        } catch (e) {
            console.log(e);
        }

        try {
            $('#back').click(self.back);
        } catch (e) {
            console.log(e);
        }

        try {
            $('#camera_reset').click(self.params.controls.reset);
        }catch (e) {
            console.log(e);
        }

        this.animate();

    };

    this.initCamera = function(params){
        params.camera = new THREE.OrthographicCamera(params.width / -2, params.width / 2,
            params.height / 2, params.height / -2, 1, 1000);

        params.camera.position.set(0, 0, 200);
        params.camera.zoom = 150;
        params.camera.updateProjectionMatrix();
    };

    this.initLighting = function(params){

        params.scene.add(new THREE.AmbientLight(0x999999));
        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-1, -1, -1).normalize();
        params.scene.add(directionalLight);

        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        params.scene.add(directionalLight);
    };

    this.initRenderer = function () {
        var params = this.params;
        var renderer = new THREE.WebGLRenderer();
        renderer.setSize(params.width, params.height);
        $("#viz").append(renderer.domElement);

        params.controls = new THREE.OrbitControls(params.camera, renderer.domElement);
        params.renderer = renderer;

    };

    this.generateShapes = function () {
        var params = this.params;
        params.pointgroup = new THREE.Group();

        params.paraboloidgroup = new THREE.Group();
        //group.rotation.x = Math.PI / 6;
        params.scene.add(params.pointgroup);
        params.scene.add(params.paraboloidgroup);


        params.shapes.grid = this.getGrid();
        params.shapes.points = this.getPoints(params.numpoints);

        params.shapes.paraboloid = this.getParaboloid();
        params.shapes.lifted = this.getLiftedPoints(params.shapes.points);

        this.start_flow();
    };


    this.scene1 = function(){
        self.params.scene.setRotationFromAxisAngle(new THREE.Vector3(1,1,1), 0);
    };

    this.step1 = function () {
        self.params.pointgroup.add(self.params.shapes.points);
    };

    this.step1_back = function(){
        self.params.axis.visible = false;
        self.params.paraboloidgroup.visible = false;
        self.params.shapes.grid.visible = false;

    };

    this.scene2 = function(){
        self.params.scene.setRotationFromAxisAngle(new THREE.Vector3(1,0,0),  -3.14/2.5)

    };

    this.step2 = function () {
        self.params.axis.visible = true;
        self.params.shapes.grid.visible = true;
        self.params.paraboloidgroup.visible = true;

    };

    this.step2_back = function(){
        self.params.shapes.points.visible = true;
        self.params.shapes.lifted.visible = false;

    };

    this.step3 = function () {
        self.params.shapes.points.visible = false;
        self.params.shapes.lifted.visible = true;
    };

    this.step3_back = function(){
        self.params.shapes.convexhull.visible = false;
        self.params.shapes.paraboloid.visible = true;

    };

    this.step4 = function(){
        self.params.shapes.convexhull.visible = true;
        self.params.shapes.paraboloid.visible = false;
    };

    this.step4_back = function(){
        self.params.shapes.projectedbottomhull.visible = false;
        self.params.shapes.lifted.visible = true;
        self.params.shapes.points.visible = false;

    };

    this.step5 = function(){
        self.params.shapes.projectedbottomhull.visible = true;
        self.params.shapes.lifted.visible = false;
        self.params.shapes.points.visible = true;

    };

    this.step5_back = function(){
        self.params.shapes.convexhull.visible = true;
        self.params.axis.visible = true;
        self.params.shapes.grid.visible = true;
        self.params.voronoi_1.visible = false;

    };

    this.step6 = function(){
        self.params.shapes.convexhull.visible = false;
        self.params.axis.visible = false;
        self.params.shapes.grid.visible = false;
        self.params.voronoi_1.visible = true;

    };

    this.step6_back = function(){
        self.params.voronoi_2.visible = false;
        self.params.shapes.delaunaycircles.visible = true;

    };

    this.step7 = function(){
        self.params.shapes.delaunaycircles.visible = false;
        self.params.voronoi_2.visible = true;

    };

    this.step7_back = function(){
        self.params.shapes.projectedbottomhull.visible = true;

    };

    this.step8 = function(){
      // remove the delaunay triangles
        self.params.shapes.projectedbottomhull.visible = false;

    };

    this.progression = [
        {
            text: "One way to compute the Voronoi diagram of a pointset in O(nlogn) is to lift the points to a paraboloid and compute the convex hull.",
            next: self.step1,
            back: self.step1_back,
            scene: self.scene1
        },
        {
            text: "The paraboloid is of the form x2 + y2  z2, so that its x-y cross sections are circles.",
            next: self.step2,
            back: self.step2_back,
            scene: self.scene2
        },
        {
            text: "To lift the points, simply add a z component that matches the z value of the paraboloid.",
            next: self.step3,
            back: self.step3_back
        },
        {
            text: "Create the convex hull of the points on the paraboloid.",
            next: self.step4,
            back: self.step4_back
        },
        {
            text: "Project the edges of the convex hull back down to the plane to get the Delaunay triangulation.",
            next: self.step5,
            back: self.step5_back
        },
        {
            text: "The Voronoi diagram is the dual of the Delaunay triangulation.",
            next: self.step6,
            back: self.step6_back
        },
        {
            text: "The Voronoi diagram is the dual of the Delaunay triangulation.",
            next: self.step7,
            back: self.step7_back
        },
        {
            text: "The Voronoi diagram is the dual of the Delaunay triangulation.",
            next: self.step8
        }
    ];

    this.place = 0;

    this.updatebuttons = function(){
        if (self.place === self.progression.length - 1){
            if (!$("#next").hasClass("disabled")) {
                $("#next").addClass("disabled");
            }
        } else {
            if ($("#next").hasClass("disabled")) {
                $("#next").removeClass("disabled");
            }
        }

        if (self.place <= 0){
            if (!$("#back").hasClass("disabled")) {
                $("#back").addClass("disabled");
            }
        } else {
            if ($("#back").hasClass("disabled")) {
                $("#back").removeClass("disabled");
            }
        }
    };

    this.start_flow = function(){
        self.place = 0;
        var step = self.progression[self.place];
        step.next();
        self.goto(self.place);
    };

    this.goto = function(idx){
        var step = self.progression[idx];

        $("#description").text(step.text);

        if (_.has(step, "scene")){
            step.scene();
        }

        self.updatebuttons();
    };

    this.next = function () {
        self.place = Math.min(self.place + 1, self.progression.length);
        var step = self.progression[self.place];
        step.next();
        self.goto(self.place);
    };

    this.back = function () {
        self.place = Math.max(0, self.place - 1);
        var step = self.progression[self.place];
        if (_.has(step, 'back')) {
            step.back();
        }
        self.goto(self.place);
    };

    this.getCircle = function(dt){
        var vertices = [];
        var vert = dt.geometry.attributes.position.array;
        for (var i = 0; i < vert.length; i += 3){
            var v = new THREE.Vector3(vert[i], vert[i+1], vert[i+2]);
            if (_.isUndefined(_.findWhere(vertices, {x: v.x, y: v.y, z: 0}))) {
                vertices.push(v);
            }
        }
        var props = self.getCircleProperties(vertices);
        var x = props.x;
        var y = props.y;
        var r = props.r;
        var geometry = new THREE.CircleGeometry(r, 50);
        geometry.translate(x, y, 0);

        var edges = new THREE.EdgesGeometry(geometry);

        var material = new THREE.LineBasicMaterial({
            color: 0xffff00,
            linecap: 'round', //ignored by WebGLRenderer
            linejoin:  'round' //ignored by WebGLRenderer
        });


        var seg = [{
            edge: [vertices[0], vertices[1]],
            neighbor: null
        }, {
            edge: [vertices[1], vertices[2]],
            neighbor: null
        }, {
            edge: [vertices[2], vertices[0]],
            neighbor: null
        }];

        return {
            id: _.uniqueId(),
            edges: seg,
            circle: new THREE.LineSegments(edges, material),
            center: new THREE.Vector3(x, y, 0)
        }
    };

    this.getCircleProperties = function(vertices){

        // Compute the coordinates of the center of the circumcircle, radius
        var v1 = vertices[0];
        var v2 = vertices[1];
        var v3 = vertices[2];

        var ab = Math.pow(v1.x, 2) + Math.pow(v1.y, 2);
        var cd = Math.pow(v2.x, 2) + Math.pow(v2.y, 2);
        var ef = Math.pow(v3.x, 2) + Math.pow(v3.y, 2);

        // Compute the circumcircle
        var circumX = 	(ab * (v3.y - v2.y) + cd * (v1.y - v3.y) + ef * (v2.y - v1.y)) /
            (v1.x * (v3.y - v2.y) + v2.x * (v1.y - v3.y) + v3.x * (v2.y - v1.y)) / 2;
        var circumY = 	(ab * (v3.x - v2.x) + cd * (v1.x - v3.x) + ef * (v2.x - v1.x)) /
            (v1.y * (v3.x - v2.x) + v2.y * (v1.x - v3.x) + v3.y * (v2.x - v1.x)) / 2;
        var radius = Math.sqrt(Math.pow(v1.x - circumX, 2) + Math.pow(v1.y - circumY, 2));

        return {
            x: circumX,
            y: circumY,
            r: radius
        };
    };

    this.toVoronoiBottom_1 = function() {
        self.params.triangles = [];
        var vv = [];
        var circles = new THREE.Object3D();

        _.each(self.params.shapes.projectedbottomhull.children, function (tri) {
            var dt = tri.clone();
            var c = self.getCircle(dt);

            self.params.triangles.push(c);

            circles.add(c.circle);

            vv.push(c.center);

        });
        var vorvert = self.addPoints(vv, 0x0000ff);

        self.params.shapes.delaunaycircles = circles;

        self.params.voronoi_1 = new THREE.Group();
        self.params.voronoi_1.add(vorvert);
        self.params.voronoi_1.add(circles);
        self.params.voronoi_1.visible = false;
        self.params.pointgroup.add(self.params.voronoi_1);

        self.findNeighbors();

    };


    this.findNeighbors = function(){
        function edgematch (d, e){
            return (pointmatch(d[0], e[0]) && pointmatch(d[1], e[1])) || (pointmatch(d[0], e[1]) && pointmatch(d[1], e[0]));
        }

        function pointmatch(a, b){
            return a.x == b.x && a.y == b.y && a.z == b.z;
        }

        for (var i = 0; i < self.params.triangles.length; i++){
            var t = self.params.triangles[i];
            _.each(t.edges, function(e) {
                if (e.neighbor !== null){
                    return;
                }
                for (var j = 0; j < self.params.triangles.length; j++){
                    if (i === j){
                        continue;
                    }
                    var t1 = self.params.triangles[j];

                    _.each(t1.edges, function(e1){
                        if (e1.neighbor !== null){
                            return;
                        }
                        if (edgematch(e.edge, e1.edge)){
                            e.neighbor = t1.id;
                            e1.neighbor = t.id;
                        }
                    });
                }

            });
        }
    };

    this.toVoronoiBottom_2 = function(){
        /**
         * For each edge in the triangulation, create a new perpendicular edge between the circumcentres
         * of the two triangles that share that edge.
         */
        self.params.shapes.voronoiedges = new THREE.Object3D();
        self.params.scene.add(self.params.shapes.voronoiedges);

        var geometry = new THREE.Geometry();
        for (var i = 0; i < self.params.triangles.length; i++){
            var t = self.params.triangles[i];
            _.each(t.edges, function(e) {
                if (e.neighbor !== null){
                    var n = _.findWhere(self.params.triangles, {id: e.neighbor});

                    geometry.vertices.push(t.center, n.center);
                }

            });
        }


        var material = new THREE.LineBasicMaterial( {
            color: 0x00ffff,
            linecap: 'round', //ignored by WebGLRenderer
            linejoin:  'round' //ignored by WebGLRenderer
        } );

        self.params.voronoi_2 = new THREE.Group();
        self.params.voronoi_2.visible = false;
        self.params.pointgroup.add(self.params.voronoi_2);
        self.params.voronoi_2.add(new THREE.LineSegments( geometry, material ));

/*
            var i, j, t, n;
            for (i = 0; i < this.delaunayTriangles.length; i += 1) {
                t = this.delaunayTriangles[i];
                for (j = 0; j < 3; j += 1) {
                    n = t.getNeighbour(t.edges[j]);
                    // Ensure the Voronoi edge hasn't already been created
                    var nIndex = this.delaunayTriangles.indexOf(n);
                    if (nIndex > i) {
                        // Create the Voronoi edge between the circumcentres of the two triangles t and n
                        let e = new Edge(
                            new Vertex(t.circumX, t.circumY),
                            new Vertex(n.circumX, n.circumY)
                        );

                        this.voronoiEdges.push(e);
                    } else if (nIndex === -1) {
                        // The neighbour is a triangle that has been deleted
                        // i.e. this triangle is now on the perimeter of the Delaunay triangulation

                        // Get the perimeter edge
                        let e = t.edges[j];

                        // Remove the neighbour, just to keep everything clean
                        t.setNeighbour(e, null);

                        // Find the equation of the edge's line (y = a1.x + b1); calculate the denominator first in case it's equal to 0
                        var a1, b1, denom;
                        denom = e.v1.x - e.v2.x;
                        if (denom !== 0) {
                            a1 = (e.v1.y - e.v2.y) / denom;
                            b1 = e.v1.y - a1 * e.v1.x;
                        } else {
                            // The line is vertical; use the equation x = b1 instead
                            a1 = null;
                            b1 = e.v1.x;
                        }

                        // Get the coordinates of the middle of the edge
                        var midX = e.v1.x + (e.v2.x - e.v1.x) / 2;
                        var midY = e.v1.y + (e.v2.y - e.v1.y) / 2;

                        // Deduce the equation of the line that is perpendicular to the middle of the edge (y = a2.x + b2)
                        var a2, b2;
                        if (a1 !== null) {
                            if (a1 !== 0) {
                                a2 = -1 / a1;
                                b2 = midY - a2 * midX;
                            } else {
                                // The perpendicular is a vertical line
                                a2 = null;
                                b2 = midX;
                            }
                        } else {
                            // The perpendicular is a horizontal line
                            a2 = 0;
                            b2 = midY;
                        }

                        // Find the vertex opposite to the edge
                        var oppositeVertex = null;
                        for (var k = 0; k < 3; k += 1) {
                            var v = t.vertices[k];
                            if (e.v1 != v && e.v2 != v) {
                                oppositeVertex = v;
                                break;
                            }
                        }

                        var a3, b3, projX, coeff, chosenFar;

                        if (a2 !== null) {
                            if (a1 !== null) {
                                a3 = a2;
                                b3 = oppositeVertex.y - a3 * oppositeVertex.x;
                                projX = (b3 - b1) / (a1 - a3);
                            } else {
                                projX = b1;
                            }

                            coeff = oppositeVertex.x < projX ? this.width : 0;
                            chosenFar = new Vertex(coeff, a2 * coeff + b2);
                        } else {
                            var farY = oppositeVertex.y < midY ? this.height : 0;
                            chosenFar = new Vertex(b2, farY);
                        }

                        // Create and store the Voronoi perimeter edge
                        var newE = new Edge(new Vertex(t.circumX, t.circumY), chosenFar);
                        this.voronoiEdges.push(newE);
                    }
                }
            }*/


    };

    this.createConvexHull = function(){

// use the same points to create a convexgeometry
        var vertices = self.params.shapes.lifted.geometry.clone().vertices;

        var convexGeometry = new THREE.ConvexGeometry(vertices);
       // convexMesh = createMesh(convexGeometry);
        var alpha = .9;
        var beta = .5;
        var gamma = .5;

        var diffuseColor = new THREE.Color().setHSL(alpha, 0.5, gamma * 0.5);
        var surfaceMaterial = new THREE.MeshLambertMaterial({
            color: diffuseColor,
            opacity: .9,
            transparent: true,
            reflectivity: beta,
            side: THREE.DoubleSide
        });

        var hull = new THREE.Mesh(convexGeometry, surfaceMaterial);
        self.params.scene.add(hull);

        self.params.shapes.convexhull = hull;
    };

    this.projectConvexHullBottom = function(){

        self.params.shapes.projectedbottomhull = new THREE.Object3D();
        self.params.shapes.projectedbottomhull.visible = false;

        self.params.scene.add(self.params.shapes.projectedbottomhull);

        var vertices = self.params.shapes.convexhull.geometry.vertices;

        _.each(self.params.shapes.convexhull.geometry.faces, function(face){
            if (visibleFromBottom(face, vertices)){
                var projected = [];

                var va = vertices[face.a];
                projected.push(new THREE.Vector3(va.x, va.y, 0));

                var vb = vertices[face.b];
                projected.push(new THREE.Vector3(vb.x, vb.y, 0));

                var vc = vertices[face.c];
                projected.push(new THREE.Vector3(vc.x, vc.y, 0));

                self.params.shapes.projectedbottomhull.add(self.createDelaunayTriangle(projected));
            }
        });

    };

    this.projectConvexHullTop = function(){

        self.params.shapes.projectedtophull = new THREE.Object3D();
        self.params.scene.add(self.params.shapes.projectedtophull);

        var vertices = self.params.shapes.convexhull.vertices;

        _.each(self.params.shapes.convexhull.faces, function(face){
            if (visibleFromTop(face, vertices)){
                var projected = [];

                var va = vertices[face.a];
                projected.push(new THREE.Vector3(va.x, va.y, 0));

                var vb = vertices[face.b];
                projected.push(new THREE.Vector3(vb.x, vb.y, 0));

                var vc = vertices[face.c];
                projected.push(new THREE.Vector3(vc.x, vc.y, 0));

                self.params.shapes.projectedtophull.add(self.createDelaunayTriangle(projected));
            }
        });

    };

    this.createDelaunayTriangle = function (vertices) {
        var geometry = new THREE.Geometry();
        geometry.vertices = vertices;

        //create a new face using vertices 0, 1, 2
        var color = new THREE.Color(0xffaa00); //optional
        var materialIndex = 0; //optional

        var face = new THREE.Face3(0, 1, 2, null, color, materialIndex);

        //add the face to the geometry's faces array
        geometry.faces.push(face);

        //the face normals and vertex normals can be calculated automatically if not supplied above
        geometry.computeFaceNormals();

        var edges = new THREE.EdgesGeometry( geometry );


        var material = new THREE.LineBasicMaterial( {
            color: 0xffffff,
            linecap: 'round', //ignored by WebGLRenderer
            linejoin:  'round' //ignored by WebGLRenderer
        } );

        return  new THREE.LineSegments( edges, material );

    };

    function visibleFromBottom(face, vertices){
      return visible(face, vertices, new THREE.Vector3(0,0,-500));
    }

    function visibleFromTop(face, vertices){
        return visible(face, vertices, new THREE.Vector3(0,0,500));
    }

    /**
     * Whether the face is visible from the vertex
     */
    function visible( face, vertices, vertex ) {

        var va = vertices[ face[ "a" ] ];
        var vb = vertices[ face[ "b" ] ];
        var vc = vertices[ face[ "c" ] ];

        var n = normal( va, vb, vc );

        // distance from face to origin
        var dist = n.dot( va );

        return n.dot( vertex ) >= dist;

    }

    /**
     * Face normal
     */
    function normal( va, vb, vc ) {

        var cb = new THREE.Vector3();
        var ab = new THREE.Vector3();

        cb.subVectors( vc, vb );
        ab.subVectors( va, vb );
        cb.cross( ab );

        cb.normalize();

        return cb;

    }


    function bisector(a, b){
        var mid = {
            x: (a.x + b.x)/2,
            y: (a.y + b.y)/2
        };

        var slope = -1 * (b.x - a.x)/(b.y - a.y);

        //y = mx + b
        var icept = mid.y - slope * mid.x;

        return {
            m: slope,
            b: icept
        };
    }

    this.getParaboloid = function () {


        function f_surface(u, v) {

            var x = 4 * u - 2;
            var y = 4 * v - 2;
            var z = Math.pow(x, 2) + Math.pow(y, 2);

            return new THREE.Vector3(x, y, z);
        }

        var Nu = 100, Nv = 100;

        var surfaceGeometry = new THREE.ParametricGeometry(f_surface, Nu, Nv);
        /*    var imgTexture = new THREE.TextureLoader().load( "media/smooth-texture_1154-649.jpg" );
         imgTexture.wrapS = imgTexture.wrapT = THREE.RepeatWrapping;
         imgTexture.anisotropy = 16;*/
        var imgTexture = null;
        var alpha = .5;
        var beta = .5;
        var gamma = .5;

        var diffuseColor = new THREE.Color().setHSL(alpha, 0.5, gamma * 0.5);
        var surfaceMaterial = new THREE.MeshLambertMaterial({
            color: diffuseColor,
            opacity: .5,
            transparent: true,
            reflectivity: beta,
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(surfaceGeometry, surfaceMaterial);

    };

    this.getGrid = function () {
        /// backgroup grids
        var size = this.params.size * 2;
        var geometry = new THREE.PlaneGeometry(size, size, 0);
        var material = new THREE.MeshBasicMaterial({color: 0x00ff00, side: THREE.DoubleSide, wireframe: true});
        return new THREE.Mesh(geometry, material);
    };


    this.getPoints = function (numpoints) {
        var LIMIT = this.params.size;
        var i;

        function p() {
            return -LIMIT + 2 * Math.random() * LIMIT;
        }

        function pointGenerator() {
            return [p(), p(), 0];
        }

        // random points
        var points = [];
        for (i = 0; i < numpoints; i += 1) {
            points.push(pointGenerator());
        }

        return self.addPoints(points, 0xff0000);
    };

    this.addPoints = function(points, color){
        var geometry = new THREE.Geometry();
        for (var i = 0; i < points.length; i += 1) {
            var p = points[i];
            if (_.has(p, 'x')){
                geometry.vertices.push(new THREE.Vector3(p.x, p.y, p.z));

            } else {
                geometry.vertices.push(new THREE.Vector3().fromArray(p));
            }
        }

        var material = new THREE.PointsMaterial({color: color, size: 3.0});
        return new THREE.Points(geometry, material);
    };

    this.getLiftedPoints = function (particles) {
        var i;
        var points = particles.geometry.vertices;
        var geometry = new THREE.Geometry();

        for (i = 0; i < points.length; i += 1) {
            var p = [];
            p.push(points[i].x);
            p.push(points[i].y);
            p.push(Math.pow(p[0], 2) + Math.pow(p[1], 2));
            geometry.vertices.push(new THREE.Vector3().fromArray(p));
        }
        var material = new THREE.PointsMaterial({color: 0xff0000, size: 3.0});
        return new THREE.Points(geometry, material);
    };

    this.q = [];

    this.render = function() {
        var params = this.params;
        try {

            while (self.q.length > 0){
                self.q.pop()();
                params.camera.updateProjectionMatrix();
            }

            params.renderer.render(params.scene, params.camera);
        } catch (e) {
            console.log(e);
            console.log(params);
        }
    };

    this._pause = false;
    this.stop = function() {
        this._pause = true;
    };

    this.start = function() {
        this._pause = false;
        this.animate();
    };

    this.animate = function() {
        if (this._pause) {
            return;
        }
        requestAnimationFrame(self.animate);

        /// compatibility : http://caniuse.com/requestanimationframe
        self.render();


    };


    this.gridclick = function() {
        this.stop();

        this.params.raycaster.setFromCamera(this.params.mouse, this.params.camera);
        var intersects = this.params.raycaster.intersectObject(this.params.shapes.grid);

        if (intersects.length > 0) {
            var ipoint = intersects[0].point;

            if (this.params.userpoints.length >= this.params.numpoints) {
                alert("Sorry... you can only add " + String(this.params.numpoints) + " points.");
                this.start();
                return;
            }
            var updated = this.params.shapes.points.geometry.vertices[this.params.userpoints.length];
            updated.set(ipoint.x, ipoint.y, 0);

            this.params.userpoints.push(updated);

            var geometry = this.params.shapes.points.geometry;
            console.log(geometry);
            geometry.verticesNeedUpdate = true;
            geometry.elementsNeedUpdate = true;
            geometry.morphTargetsNeedUpdate = true;
            geometry.uvsNeedUpdate = true;
            geometry.normalsNeedUpdate = true;
            geometry.colorsNeedUpdate = true;
            geometry.tangentsNeedUpdate = true;
            geometry.groupsNeedUpdate = true;
            geometry.lineDistancesNeedUpdate = true;
            geometry.dynamic = true;

            geometry.__dirtyVertices = true;
            geometry.__dirtyMorphTargets = true;
            geometry.__dirtyElements = true;
            geometry.__dirtyUvs = true;
            geometry.__dirtyNormals = true;
            geometry.__dirtyTangents = true;
            geometry.__dirtyColors = true;

            this.params.camera.updateProjectionMatrix();


            /*        var points = new THREE.Geometry();
             points.vertices.push(updated);
             S.params.scene.add(new THREE.Points(points));*/

            this.start();


        } else {
            console.log("no intersection!");
        }
    };


    this.onWindowResize = function() {
        self.params.windowHalfX = window.innerWidth / 2;
        self.params.windowHalfY = window.innerHeight / 2;
        self.params.camera.aspect = window.innerWidth / window.innerHeight;
        self.params.camera.updateProjectionMatrix();
        self.params.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    this.onDocumentMouseMove = function(event) {
        event.preventDefault();
        self.params.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        self.params.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;

    };

};

CompGeo = function() {
    var self = this;
    this.params = {
        targetRotation: 0,
        windowHalfX: window.innerWidth / 2,
        windowHalfY: window.innerHeight / 2,
        width: 750,
        height: 750,
        userpoints: [],
        shapes: {},
        numpoints: 50,
        size: 2
    };

    this.init = function () {
        var params = this.params;
        params.scene = new THREE.Scene();
        params.scene.add(new THREE.AmbientLight(0x999999));
        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-1, -1, -1).normalize();
        params.scene.add(directionalLight);

        var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        params.scene.add(directionalLight);

        params.camera = new THREE.OrthographicCamera(params.width / -2, params.width / 2,
            params.height / 2, params.height / -2, 1, 1000);

        params.camera.position.set(0, 0, 200);
        params.camera.zoom = 150;
        params.camera.updateProjectionMatrix();

        params.raycaster = new THREE.Raycaster();
        params.mouse = new THREE.Vector2();

        this.initRenderer();

        this.generateShapes();

        var axisHelper = new THREE.AxisHelper(5);
        params.scene.add(axisHelper);

        document.addEventListener('mousemove', self.onDocumentMouseMove, false);
        // document.addEventListener( 'dblclick', gridclick, false );
        window.addEventListener('resize', self.onWindowResize, false);

        try {
            $('#next').click(self.next);
        } catch (e) {
            console.log(e);
        }

        this.animate();

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

        this.next();
    };


    this.step1 = function () {
        self.params.pointgroup.add(self.params.shapes.grid);
        self.params.pointgroup.add(self.params.shapes.points);
    };

    this.step2 = function () {
        self.params.paraboloidgroup.add(self.params.shapes.paraboloid);

    };

    this.step3 = function () {
        self.params.shapes.points.visible = false;
        self.params.paraboloidgroup.add(self.params.shapes.lifted);
    };

    this.step4 = function(){
        self.initConvexHull();
        //self.params.shapes.paraboloid.visible = false;
    };

    this.progression = [
        {
            text: "One way to compute the Voronoi diagram of a pointset in O(nlogn) is to lift the points to a paraboloid and compute the convex hull.",
            action: self.step1
        },
        {
            text: "The paraboloid is of the form x2 + y2  z2, so that its x-y cross sections are circles.",
            action: self.step2
        },
        {
            text: "To lift the points, simply add a z component that matches the z value of the paraboloid.",
            action: self.step3
        },
        {
            text: "Create the convex hull of the points on the paraboloid.",
            action: self.step4
        }
    ];

    this.place = 0;

    this.next = function () {
        var step = self.progression[self.place];
        step.action();
        $("#description").text(step.text);
        self.place++;

    };



    this.collinear = function (a, b, c) {
        var t = new THREE.Triangle(a, b, c);
        var r = t.area();
        if (r <= 1) {
          //  console.log(r);
        }
        return r < .25;
    };

    this.coplanar = function (a, b, c, d) {
        var t = new THREE.Triangle(a, b, c);
        var r = t.area();
        if (r <= 1) {
           // console.log(r);
        }
        if (r === 0) {
            var plane = t.plane();
            return plane.distanceToPoint(d) < .75;
        }
        return false;
    };



    this.conflicts = {
        points: [],
        facets: []
    };

    this.initConvexHull = function(){

        self.params.shapes.convexhull = new THREE.Object3D();
        self.params.scene.add(self.params.shapes.convexhull);

        // add points to conflicts list
        self.conflicts.points = self.params.shapes.lifted.geometry.clone().vertices;

        var tetra = self.createTetrahedron(self.conflicts.points);
        _.each(tetra, function(f){
            self.params.shapes.convexhull.add(f);

            // add facets to conflicts list
            self.conflicts.facets.push({
                id: _.uniqueId(),
                face: f
            });
        });

        self.initConflicts();
    };

    this.initConflicts = function(){
        // for each point in the conflicts list, link the faces it can see.
        // at the same time, add the points to the faces list.

        _.each(self.conflicts.points, function(p){

            _.each(self.conflicts.facets, function(f){
                var v = new THREE.Vector3(p.x, p.y, p.z);

                var dp = v.dot(f.face.geometry.faces[0].normal);
                if (dp >= 0){
                    if (!_.has(p, "visibleFacets")){
                        p.visibleFacets = [];
                    }
                    p.visibleFacets.push(f);

                    if (!_.has(f, "visiblePoints")){
                        f.visiblePoints = [];
                    }
                    f.visiblePoints.push(p);
                }
            });
        });
        console.log(self.conflicts);
    };

    this.createTetrahedron = function(vertices){

        function nextPoint(){
            var i = _.random(vertices.length - 1);
            return vertices.splice(i, 1)[0];
        }

        var a = nextPoint();

        var b = nextPoint();

        var c = nextPoint();


        var skipped = [];
        while(self.collinear(a, b, c)){
            skipped.push(c);
            c = nextPoint();
        }


        var d = nextPoint();


        while(self.coplanar(a, b, c, d)){
            skipped.push(d);
            d = nextPoint();
        }

        _.each(skipped, function(s){
           vertices.push(s);
        });

        var f1 = this.createFace(a,b,c);
        var f2 = this.createFace(a,b,d);
        var f3 = this.createFace(b,c,d);
        var f4 = this.createFace(a,c,d);

        return [f1, f2, f3, f4];

    };

    this.createFace = function(a, b, c){
        var material = new THREE.MeshStandardMaterial( { color : 0x00cc00,
            side: THREE.DoubleSide} );

//create a triangular geometry
        var geometry = new THREE.Geometry();
        geometry.vertices.push( new THREE.Vector3( a.x, a.y, a.z ) );
        geometry.vertices.push( new THREE.Vector3(  b.x, b.y, b.z ) );
        geometry.vertices.push( new THREE.Vector3(  c.x,  c.y, c.z ) );

//create a new face using vertices 0, 1, 2
        var normal = new THREE.Vector3( 0, 1, 0 ); //optional
        var color = new THREE.Color( 0xffaa00 ); //optional
        var materialIndex = 0; //optional
        var face = new THREE.Face3( 0, 1, 2, normal, color, materialIndex );

//add the face to the geometry's faces array
        geometry.faces.push( face );

//the face normals and vertex normals can be calculated automatically if not supplied above
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();

        return new THREE.Mesh( geometry, material );
    };

    this.createCannedConvexHull = function(){
/*        var vertices = self.params.shapes.lifted.geometry.vertices;
        var a = self.nextHullPoint(vertices);
        var b = self.nextHullPoint(vertices);
        var c = self.nextHullPoint(vertices);

        while(self.collinear(a, b, c)){
            c = self.nextHullPoint(vertices);
        }
        var d = self.nextHullPoint(vertices);
        while(self.coplanar(a, b, c, d)){
            d = self.nextHullPoint(vertices);
        }
        console.log(a);
        console.log(b);
        console.log(c);
        console.log(d);

        this.params.shapes.convexHull = new THREE.ShapeGeometry();*/
// use the same points to create a convexgeometry
        var vertices = self.params.shapes.lifted.geometry.vertices;
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
    };

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

        var geometry = new THREE.Geometry();
        for (i = 0; i < points.length; i += 1) {
            geometry.vertices.push(new THREE.Vector3().fromArray(points[i]));
        }

        var material = new THREE.PointsMaterial({color: 0xff0000, size: 3.0});
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

    this.render = function() {
        var params = this.params;
        try {
            params.scene.rotation.y += ( params.targetRotation - params.scene.rotation.y ) * 0.05;
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
        /// compatibility : http://caniuse.com/requestanimationframe
        self.render();

        requestAnimationFrame(self.animate);

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
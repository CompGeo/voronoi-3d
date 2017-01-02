/**
 * Created by cbarne02 on 1/1/17.
 */

function ConvexHull(vertices) {
    this.vertices = vertices;
    var self = this;

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


    this.initConvexHull = function () {

        self.convexhull = new THREE.Object3D();
       // self.params.scene.add(self.convexhull);

        // add points to conflicts list
        self.conflicts.points = self.vertices;

        var tetra = self.createTetrahedron(self.conflicts.points);
        _.each(tetra, function (f) {
            self.addNewFace(f);
        });

        self.initConflicts();
        return self.convexhull;
    };

    this.addNewFace = function (f) {
        self.convexhull.add(f);

        var id = _.uniqueId();
        // add facets to conflicts list
        self.conflicts.facets.push({
            id: id,
            face: f
        });

        //var helper = new THREE.FaceNormalsHelper( f, 2, 0x00ff00, 1 );

        //self.params.scene.add(helper);

        return id;
    };

    this.initConflicts = function () {
        // for each point in the conflicts list, link the faces it can see.
        // at the same time, add the points to the faces list.

        _.each(self.conflicts.points, function (p) {
            p.visibleFacets = [];
            _.each(self.conflicts.facets, function (f) {
                var v = new THREE.Vector3(p.x, p.y, p.z);

                var dp = v.dot(f.face.geometry.faces[0].normal);
                if (dp >= 0) {
                    /*                    if (!_.has(p, "visibleFacets")){
                     p.visibleFacets = [];
                     }*/
                    p.visibleFacets.push(f);

                    /*                    if (!_.has(f, "visiblePoints")){
                     f.visiblePoints = [];
                     }
                     f.visiblePoints.push(p);*/
                }
            });
        });
    };

    this.updateFacetConflicts = function (facetUpdates) {
        _.each(self.conflicts.points, function (p) {

            _.each(self.conflicts.facets, function (f) {
                var v = new THREE.Vector3(p.x, p.y, p.z);

                var dp = v.dot(f.face.geometry.faces[0].normal);
                if (dp >= 0) {
                    if (!_.has(p, "visibleFacets")) {
                        p.visibleFacets = [];
                    }
                    p.visibleFacets.push(f);

                    /*                    if (!_.has(f, "visiblePoints")){
                     f.visiblePoints = [];
                     }
                     f.visiblePoints.push(p);*/
                }
            });
        });
    };

// seed the convex hull with a tetrahedron
    this.createTetrahedron = function (vertices) {

        function nextPoint() {
            var i = _.random(vertices.length - 1);
            return vertices.splice(i, 1)[0];
        }

        var a = nextPoint();

        var b = nextPoint();

        var c = nextPoint();


        var skipped = [];
        while (self.collinear(a, b, c)) {
            skipped.push(c);
            c = nextPoint();
        }


        var d = nextPoint();


        while (self.coplanar(a, b, c, d)) {
            skipped.push(d);
            d = nextPoint();
        }

        // put any skipped points back in the list
        _.each(skipped, function (s) {
            vertices.push(s);
        });

        var f1 = this.computeFaceVertices(a, b, c);
        var f2 = this.computeFaceVertices(a, b, d);
        var f3 = this.computeFaceVertices(b, c, d);
        var f4 = this.computeFaceVertices(a, c, d);

        var tetra = [];
        // need to test each normal to see if it intersects another face
        tetra.push(self.createFace(self.reorient(f1, [f2, f3, f4])));
        tetra.push(self.createFace(self.reorient(f2, [f1, f3, f4])));
        tetra.push(self.createFace(self.reorient(f3, [f2, f1, f4])));
        tetra.push(self.createFace(self.reorient(f4, [f2, f3, f1])));

        return tetra;

    };


    this.reorient = function (test, faces) {
        if (self.testFaceIntersection(test, faces)) {
            test = [test[0], test[2], test[1]];
        }
        return test;
    };

    this.testFaceIntersection = function (test, faces) {
        function intx(t, face) {
            var tri = new THREE.Triangle(t[0], t[1], t[2]);
            var ray = new THREE.Ray(tri.midpoint(), tri.normal());
            return ray.intersectTriangle(face[0], face[1], face[2]);
        }

        var itx = false;
        _.each(faces, function (f) {
            itx = itx || intx(test, f);
        });
        return itx;
    };

    this.computeFaceVertices = function (a, b, c) {
        //create a triangular geometry
        var v1 = new THREE.Vector3(a.x, a.y, a.z);
        var v2 = new THREE.Vector3(b.x, b.y, b.z);
        var v3 = new THREE.Vector3(c.x, c.y, c.z);

        return [v1, v2, v3];
    };

    this.createFace = function (vertices) {
        var geometry = new THREE.Geometry();
        geometry.vertices = vertices;

        var material = new THREE.MeshStandardMaterial({
            color: 0x00cc00,
            side: THREE.DoubleSide
        });

        //create a new face using vertices 0, 1, 2
        var color = new THREE.Color(0xffaa00); //optional
        var materialIndex = 0; //optional

        var face = new THREE.Face3(0, 1, 2, null, color, materialIndex);

        //add the face to the geometry's faces array
        geometry.faces.push(face);

        //the face normals and vertex normals can be calculated automatically if not supplied above
        geometry.computeFaceNormals();

        return new THREE.Mesh(geometry, material);
    };

    this.incrementConvexHull = function () {
        // add a point to the convex hull from the conflicts list

        var p = self.conflicts.points.pop();

        // if inside the hull, do nothing
        // if outside the hull, add to hull.
        // is it ever the case that the point will be inside the hull? probably not

        // only need to update visible faces
        // updates= delete visible faces...check conflicts list
        var newFaces = [];

        var visible = p.visibleFacets;

        var ids = _.pluck(visible, 'id');

        self.conflicts.facets = _.reject(self.conflicts.facets, function (facet) {
            return _.contains(ids, facet.id);
        });

        _.each(visible, function (f) {

            //console.log(f);

            var v = f.face.geometry.vertices;
            self.removeFaceFromCH(v);

            newFaces.push(self.addNewFace(self.createFace([v[0], v[1], p])));
            newFaces.push(self.addNewFace(self.createFace([v[1], v[2], p])));
            newFaces.push(self.addNewFace(self.createFace([v[2], v[0], p])));

            //update conflicts list
            //console.log(p);
        });

        //console.log(self.params.shapes.convexhull.children.length);
        //console.log(newFaces);

        //check new faces to see if any are interior.  if so, remove them.
        if (newFaces.length > 3) {
            //there must be some interior faces... remove them
            console.log('remove some faces?');
        }

        self.initConflicts();
        //console.log(newFaces);


        // add new faces.... how do we update the conflicts list w/o checking every point? Probably can narrow our
        // check to points only visible to the faces we delete

        //var f = self.createFace(p.x, p.y, p.z);
        //self.addNewFace(f);
        console.log(self.conflicts.points.length);
    };

    this.removeFaceFromCH = function (v) {
        // remove this face
        var removed = [];
        _.each(self.params.shapes.convexhull.children, function (c) {
            var cv = c.geometry.vertices;
            for (var i = 0; i < 3; i++) {
                var match = true;
                if (cv[i] !== v[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                removed.push(c);
            }
        });

        _.each(removed, function (r) {
            self.params.shapes.convexhull.remove(r);
        });

    };
}

var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

d3.json("./data/publications_network.json").then(function (data){
    let svg = d3.select('body').append("svg").attr("viewBox","0 0 " + width + " " + height)
    simulate(data,svg)
})

function simulate(data,svg) {

    let publications = {};
    data.nodes.forEach((d,i)=>publications[i]=d.count)

    const degreeExtent = d3.extent(Object.values(publications), d=>d);

    const radiusScale = d3.scaleSqrt()
        .domain(degreeExtent)
        .range([20,50]);

    const colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateViridis)
        .domain([0,25]);

    const linkWeightMap = {}

    for(linkId in data.links) {
        source = data.links[linkId].source
        target = data.links[linkId].target
        counter = 0;
        for(sAuthorId in data.nodes[source].authors) {
            for(tAuthorId in data.nodes[target].authors) {
                if(data.nodes[source].authors[sAuthorId]===data.nodes[target].authors[tAuthorId]) {
                    counter++
                }
            }
        }
        linkWeightMap[source + "~" + target] = counter;
    }

    const strokeScale = d3.scaleLinear()
        .domain(d3.extent(Object.values(linkWeightMap), d=>d)).range([.3,3])
    
    let gCanvas = svg.append("g").attr("class", "canvas");

    let gLinks = gCanvas.selectAll('.links')
        .data(data.links)
        .enter()
        .append('line')
        .attr('stroke', 'black')
        .attr('stroke-width', d=> strokeScale(linkWeightMap[d.source + "~" + d.target]));
    
    let gNodes = gCanvas.selectAll()
        .data(data.nodes)
        .enter()
        .append('g');

    gNodes.append('circle')
        .attr('r'   , (d,i) => radiusScale(publications[i]))
        .attr('fill',   d   => colorScale(d.id))
        .attr('class', d=>"g_"+d.id);


    gNodes.on("mouseenter", (d,m)=> {
        d3.selectAll("circle").classed("inActive", true);
        d3.selectAll(".g_"+ m.id).classed("inActive", false);

        data.links.filter(function(e){return e.source.id == m.id}).forEach(d=> {
            d3.selectAll(".g_"+ d.target.id).classed("inActive", false)
        })

        data.links.filter(function(e){return e.target.id == m.id}).forEach(d=> {
            d3.selectAll(".g_"+ d.source.id).classed("inActive", false)
        })
    })

    gNodes.on("mouseleave", (d,m)=> {
        d3.selectAll("circle").classed("inActive", false);
    })

    gNodes.append("text")
        .text(d=>d.name)
        .attr("text-anchor", "middle");
            
    let fSim = d3.forceSimulation(data.nodes)
            .force('center',  d3.forceCenter(width/2, height/2))
            .force('links',   d3.forceLink(data.links).distance(10).strength(.8))
            .force('collide', d3.forceCollide().radius((d,i)=>radiusScale(publications[i])+26).iterations(5))
            .force("charge",  d3.forceManyBody().strength(-10))
            .on('tick', update);

    function update() {
        gNodes.attr('transform', d=> { return `translate(${d.x}, ${d.y})`})

        gLinks.attr('x1', d=>d.source.x)
        .attr('y1', d=>d.source.y)
        .attr('x2', d=>d.target.x)
        .attr('y2', d=>d.target.y);

        svg.call(d3.zoom()
            .extent([[0,0],[width, height]])
            .scaleExtent([1,8])
            .on("zoom", ({transform}) => {
                gCanvas.attr("transform", transform);
            })
        )
    }

    gLinks.attr('class', d=> {
        return 'lines'
    })
}
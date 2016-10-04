$(document).ready(function() {
    var mainImage = $('#image')[0];
    var paper = new Raphael(mainImage, 300, 482);

    var imageURL = 'belaDiagram/images/bela_pins_jun2016.jpg';
    
    // write the image to the Raphael canvas
    paper.image(imageURL, 0, 0, 300, 482);

    var url = 'belaDiagram/json/data.json';
    $.getJSON(url, function(data){
        for (var i in data){
            for (var k in data[i].things){
                var elem = data[i].things[k];
                var classname = elem.elemclass + " " + "tooltip";
                var rect = paper.rect(elem.x, elem.y, elem.width, elem.height);
                rect.node.setAttribute("class", classname);
                rect.node.id = elem.id;
                $(rect.node).tooltipster({
                    content: $('<div class="tipText">' + elem.text + '</div>'),
                    multiple: false
                    // putting theme here breaks things
                });
                
            }
        }

        $('rect').mouseenter(function() {
            $(this).css("border", "2px solid red");
        });
        
        $('rect').mouseleave(function() {
            var tempID = "span#z" + $(this).attr('id');
            $(tempID).attr("style", null);
        });

    });

}); // end document.ready callback  
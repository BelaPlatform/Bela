$(document).ready(function() {
  var mainImage = $('#image')[0];
  var paper = new Raphael(mainImage, 300, 482);
  var imageURL = '/belaDiagram/images/mini_pin_diagram.png';

  // write the image to the Raphael canvas
  paper.image(imageURL, 0, 0, 300, 482);

  var url = '/belaDiagram/json/data_mini.json';
  $.getJSON(url, function(data){
    for (var i in data){
      for (var k in data[i].things){
          var elem = data[i].things[k];
          var classname = elem.elemclass + " " + "tooltip";
          var rotate = true;
          var x = elem.x;
          var y = elem.y;
          var width = elem.width;
          var height = elem.height;
          if(rotate)
          {	// rotate the figure by 180 degrees:
            var totWidth = 300;
            var totHeight = 481;
            x = totWidth - x - width;
            y = totHeight - y - height;
          }
          var rect = paper.rect(x, y, width, height);
          rect.node.setAttribute("class", classname);
          rect.node.id = k;
          $(rect.node).tooltipster({
            content: $('<div class="tipText">' + elem.text + '</div>'),
            multiple: false
              // putting theme here breaks things
          });
        }
    }

    $('rect').mouseenter(function() {
      $(this).css("outline", "2px solid red");
    });

    $('rect').mouseleave(function() {
      var elID = $(this).attr('id');
      var tempID = "span#z" + elID;
      $(tempID).attr("style", null);
      $(this).css("outline", "none");
    });

  });

}); // end document.ready callback

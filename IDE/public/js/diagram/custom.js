$(document).ready(function() {
  var mainImage = $('#image')[0];
  const board = window.location.search.replace('?','');

  if (board == 'BelaMini') {
    var paper = new Raphael(mainImage, 300, 482);
    var imageURL = '/belaDiagram/images/BelaMini.png';
    var url = '/belaDiagram/json/data_mini.json';
    paper.image(imageURL, 0, 0, 300, 482);
  } else if (board == 'CtagFace') {
    var paper = new Raphael(mainImage, 300, 686);
    var imageURL = '/belaDiagram/images/ctag_FACE.jpg';
    var url = '/belaDiagram/json/data_ctag_FACE.json';
    paper.image(imageURL, 0, 0, 300, 686);
  } else if (board == 'CtagFaceBela') {
    var paper = new Raphael(mainImage, 300, 686);
    var imageURL = '/belaDiagram/images/ctag_FACE_BELA.jpg';
    var url = '/belaDiagram/json/data_ctag_BELA.json';
    paper.image(imageURL, 0, 0, 300, 686);
  } else if (board == 'CtagBeast') {
    var paper = new Raphael(mainImage, 300, 767);
    var imageURL = '/belaDiagram/images/ctag_BEAST.jpg';
    var url = '/belaDiagram/json/data_ctag_BEAST_slave.json';
    paper.image(imageURL, 0, 0, 300, 767);
  } else if (board == 'CtagBeastBela') {
    var paper = new Raphael(mainImage, 300, 767);
    var imageURL = '/belaDiagram/images/ctag_BEAST_BELA.jpg';
    var url = '/belaDiagram/json/data_ctag_BEAST_BELA.json';
    paper.image(imageURL, 0, 0, 300, 767);
  } else {
    var paper = new Raphael(mainImage, 300, 482);
    var imageURL = '/belaDiagram/images/Bela.jpg';
    var url = '/belaDiagram/json/data.json';
    paper.image(imageURL, 0, 0, 300, 482);
  }

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
      $(this).css("outline", 'none');
    });

  });

}); // end document.ready callback

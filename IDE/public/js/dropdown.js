// dropdowns
var dropdowns = function(){
  $('[data-dropdown-for]').on('click', function() {
    var source = $(this).data('dropdown-for');
    $('[data-dropdown]').each(function() {
      var target = $(this).data('dropdown');
      if (target === source) {
        $(this).addClass('show');
      }
    });
  });
  // Close the dropdown menu if the user clicks outside of it
  window.onclick = function(event) {
    if (!event.target.matches('[data-dropdown-for]')) {
      $('[data-dropdown]').removeClass('show')
    }
  }
  // accordians
  $('[data-accordion-for]').on('click', function() {
    var that = $(this);
    var source = $(this).data('accordion-for');
    $('[data-accordion]').each(function() {
      var target = $(this).data('accordion');
      if (target === source) {
        that.toggleClass('active');
        $(this).toggleClass('show');
      }
    });
  });
}();

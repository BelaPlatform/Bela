var dropdownLoaded = false;

$('[data-tabs]').on('click', function(){
  if (!dropdownLoaded) {
    var $script = $("<script></script>").attr('src', '/js/dropdown.js');
    $script.appendTo($('head'));
    dropdownLoaded = true;
  }
});

// increment / decrement the text inputs styled to look like the number inputs
$('[data-number-picker]').each(function(){
  $(this).find('[data-number-picker-increment]').on('click', function(){
    if (+($(this).siblings('[data-number-picker-input]').val()) < +($(this).siblings('[data-number-picker-input]').attr('max'))) {
      $(this).siblings('[data-number-picker-input]').val(+($(this).siblings('[data-number-picker-input]').val()) + +($(this).siblings('[data-number-picker-input]').attr('step')));
      $(this).val(+($(this).siblings('[data-number-picker-input]').val()));
    }
  });
  $(this).find('[data-number-picker-decrement]').on('click', function(){
    if (+($(this).siblings('[data-number-picker-input]').val()) > +($(this).siblings('[data-number-picker-input]').attr('min'))) {
      $(this).siblings('[data-number-picker-input]').val(+($(this).siblings('[data-number-picker-input]').val()) - +($(this).siblings('[data-number-picker-input]').attr('step')));
      $(this).val(+($(this).siblings('[data-number-picker-input]').val()));
    }
  });
});

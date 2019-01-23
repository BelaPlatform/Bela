// define the tabs object
function openTabs() {
  $('[data-tabs]').toggleClass('tabs-open');
  $('[data-tab-open] span').toggleClass('rot');
}

function matchTabForAndTab(tabFor) {
  $('[data-tab]').each(function(){
    var tab = $(this).data('tab');
    $(this).hide();
    if (tab === tabFor) {
      $(this).fadeIn();
    }
  });
}

function matchTabFor(target) {
  var tab = target;
  $('[data-tab-for]').each(function(){
    var tabFor = $(this).data('tab-for');
    if (tabFor === tab) {
      $(this).addClass('active');
      matchTabForAndTab(tabFor);
    }
  });
}

// Open the tabs:
$('[data-tab-open]').click(function(event) {
  event.preventDefault();
  // If none of the tabs are active:
  var len = $('[data-tab-menu] .active').length;
  if (len < 1) {
    // Then show the project explorer.
    matchTabFor("explorer");
  }
  openTabs();
});

// Making the tab labels active/inactive:
$('[data-tab-for]').click(function(event) {
  event.preventDefault();
  //  First remove class "active" from currently active tab
  $('[data-tab-for]').removeClass('active');
  $(this).addClass('active');
  var tabFor = $(this).data('tab-for');
  matchTabFor(tabFor);
  if ($('[data-tabs]').hasClass('tabs-open')) {
    return false;
  }
  //  At the end, we add return false so that the click on the link is not executed
});

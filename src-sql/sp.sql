DELIMITER //

CREATE PROCEDURE wp.get_wp_links ()
 BEGIN
  SELECT * FROM wp_links;
 END;
//

DELIMITER ;

